package expo.modules.pcuploadserver

import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.Uri
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import fi.iki.elonen.NanoHTTPD
import java.io.File
import java.io.IOException
import java.net.Inet4Address
import java.net.NetworkInterface
import java.util.Collections
import java.util.UUID
import kotlin.random.Random

private const val PREFERRED_PORT = 8787
private const val SOCKET_READ_TIMEOUT_MS = 15000

class NoWifiException :
  CodedException("ERR_NO_WIFI", "Устройство не подключено к Wi-Fi", null)

class ServerBusyException :
  CodedException("ERR_SERVER_BUSY", "Сервер уже запущен", null)

/**
 * Локальный HTTP-сервер для приёма аудиокниг с ПК по Wi-Fi.
 * «Глупый приёмник»: только пишет байты в staging-папку песочницы и сообщает JS о готовых
 * сабмитах через события — сборка книги (buildBook/addBook) остаётся в JS, модуль о ней не знает.
 */
class PcUploadServerModule : Module() {
  private var server: UploadHttpServer? = null
  private var currentPin: String? = null
  private var currentToken: String? = null
  private var stagingRoot: File? = null

  override fun definition() = ModuleDefinition {
    Name("PcUploadServer")

    Events("onSubmitStarted", "onSubmitDone", "onError")

    AsyncFunction("startAsync") {
      val context = requireContext()
      if (server != null) throw ServerBusyException()
      if (!isWifiConnected(context)) throw NoWifiException()
      val ip = findLocalIpv4() ?: throw NoWifiException()

      val pin = String.format("%04d", Random.nextInt(10000))
      currentPin = pin
      currentToken = null

      val root = File(context.cacheDir, "pc-upload")
      root.deleteRecursively()
      root.mkdirs()
      stagingRoot = root

      val srv = startServerOnFirstFreePort(context)
      server = srv

      return@AsyncFunction mapOf(
        "ip" to ip,
        "port" to srv.listeningPort,
        "pin" to pin,
      )
    }

    AsyncFunction("stopAsync") {
      server?.stop()
      server = null
      currentPin = null
      currentToken = null
      stagingRoot?.deleteRecursively()
      stagingRoot = null
    }
  }

  private fun requireContext(): Context =
    appContext.reactContext ?: throw CodedException("ERR_NO_CONTEXT", "Нет контекста приложения", null)

  private fun startServerOnFirstFreePort(context: Context): UploadHttpServer {
    return try {
      val srv = UploadHttpServer(context, PREFERRED_PORT)
      srv.start(SOCKET_READ_TIMEOUT_MS, false)
      srv
    } catch (e: IOException) {
      // Порт занят — пробуем любой свободный (0 = система сама выберет).
      val srv = UploadHttpServer(context, 0)
      srv.start(SOCKET_READ_TIMEOUT_MS, false)
      srv
    }
  }

  private fun isWifiConnected(context: Context): Boolean {
    val cm = context.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager ?: return false
    val network = cm.activeNetwork ?: return false
    val caps = cm.getNetworkCapabilities(network) ?: return false
    return caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)
  }

  /** Первый non-loopback IPv4 на Wi-Fi/точке доступа интерфейсе. */
  private fun findLocalIpv4(): String? {
    val interfaces = try {
      NetworkInterface.getNetworkInterfaces()
    } catch (e: Exception) {
      null
    } ?: return null

    val candidates = Collections.list(interfaces)
      .filter { it.isUp && !it.isLoopback }
      .sortedByDescending { iface ->
        // Предпочитаем интерфейсы Wi-Fi/точки доступа над мобильной передачей данных.
        val n = iface.name.lowercase()
        if (n.contains("wlan") || n.contains("ap") || n.contains("swlan")) 1 else 0
      }

    for (iface in candidates) {
      for (addr in Collections.list(iface.inetAddresses)) {
        if (addr is Inet4Address && !addr.isLoopbackAddress) return addr.hostAddress
      }
    }
    return null
  }

  /**
   * NanoHTTPD 2.3.1 без явного charset в Content-Type multipart-запроса (а браузеры его не шлют)
   * декодирует заголовки/значения частей как US-ASCII — кириллица необратимо превращается в "?"
   * ещё при разборе тела запроса. Клиент (pc_upload.html) поэтому шлёт название и имена файлов
   * через encodeURIComponent отдельными ASCII-safe полями — здесь декодируем обратно.
   */
  private fun decodeText(raw: String): String =
    try {
      java.net.URLDecoder.decode(raw, "UTF-8")
    } catch (e: Exception) {
      raw
    }

  private fun sanitizeName(rawName: String): String {
    val base = rawName.substringAfterLast('/').substringAfterLast('\\')
    val cleaned = base.replace(Regex("[^\\w.\\-]+"), "_").take(120)
    return cleaned.ifBlank { "file" }
  }

  /** Встроенный HTTP-сервер (inner class — читает pin/token/staging-папку напрямую у модуля). */
  private inner class UploadHttpServer(private val context: Context, port: Int) : NanoHTTPD(port) {

    override fun serve(session: IHTTPSession): Response {
      return try {
        when {
          session.method == Method.GET && (session.uri == "/" || session.uri == "/index.html") ->
            serveIndex()
          session.method == Method.POST && session.uri == "/api/login" -> handleLogin(session)
          session.method == Method.POST && session.uri == "/api/upload" -> handleUpload(session)
          else -> newFixedLengthResponse(Response.Status.NOT_FOUND, MIME_PLAINTEXT, "Not found")
        }
      } catch (e: Exception) {
        sendEvent("onError", mapOf("message" to (e.message ?: "Unknown error")))
        newFixedLengthResponse(Response.Status.INTERNAL_ERROR, "application/json", "{\"ok\":false}")
      }
    }

    private fun serveIndex(): Response {
      val stream = context.assets.open("pc_upload.html")
      return newChunkedResponse(Response.Status.OK, "text/html; charset=utf-8", stream)
    }

    private fun handleLogin(session: IHTTPSession): Response {
      val files = HashMap<String, String>()
      session.parseBody(files)
      val pin = session.parms["pin"]
      if (pin == null || pin != currentPin) {
        return newFixedLengthResponse(Response.Status.UNAUTHORIZED, "application/json", "{\"ok\":false}")
      }
      val token = UUID.randomUUID().toString()
      currentToken = token
      return newFixedLengthResponse(Response.Status.OK, "application/json", "{\"ok\":true,\"token\":\"$token\"}")
    }

    private fun handleUpload(session: IHTTPSession): Response {
      val filesMap = HashMap<String, String>()
      // Блокирует поток сервера до полного приёма multipart-тела — NanoHTTPD сам пишет части
      // во временные файлы, оригинальные имена дублируются в session.parms по тому же полю.
      session.parseBody(filesMap)

      val token = session.parms["token"]
      if (token == null || token != currentToken) {
        return newFixedLengthResponse(Response.Status.UNAUTHORIZED, "application/json", "{\"ok\":false}")
      }

      val submitId = UUID.randomUUID().toString()
      sendEvent("onSubmitStarted", mapOf("submitId" to submitId))

      val root = stagingRoot ?: throw IllegalStateException("Сервер не готов")
      val dir = File(root, submitId).apply { mkdirs() }

      val received = mutableListOf<Map<String, String>>()
      for ((field, tempPath) in filesMap) {
        if (!field.startsWith("file")) continue
        // Оригинальное имя приходит отдельным percent-encoded полем ("name" + индекс) — см.
        // decodeText() ниже, почему нельзя брать его из filename= атрибута/session.parms[field].
        val index = field.removePrefix("file")
        val rawName = session.parms["name$index"] ?: session.parms[field] ?: File(tempPath).name
        val originalName = decodeText(rawName)
        val dest = File(dir, sanitizeName(originalName))
        File(tempPath).copyTo(dest, overwrite = true)
        received.add(mapOf("uri" to Uri.fromFile(dest).toString(), "name" to originalName))
      }

      if (received.isEmpty()) {
        return newFixedLengthResponse(Response.Status.BAD_REQUEST, "application/json", "{\"ok\":false}")
      }

      val kind = session.parms["kind"] ?: "files"
      val title = decodeText(session.parms["title"] ?: "")
      sendEvent(
        "onSubmitDone",
        mapOf(
          "submitId" to submitId,
          "kind" to kind,
          "title" to title,
          "files" to received,
        ),
      )
      return newFixedLengthResponse(Response.Status.OK, "application/json", "{\"ok\":true}")
    }
  }
}
