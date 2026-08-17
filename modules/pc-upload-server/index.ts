// Re-export the native module. On web, it will be resolved to PcUploadServerModule.web.ts
// and on native platforms to PcUploadServerModule.ts
export { default } from './src/PcUploadServerModule';
export * from './src/PcUploadServer.types';
