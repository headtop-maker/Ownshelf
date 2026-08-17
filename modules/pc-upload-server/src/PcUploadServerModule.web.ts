import { registerWebModule, NativeModule } from 'expo';

import type { PcUploadServerModuleEvents, StartResult } from './PcUploadServer.types';

/** Загрузка с ПК — фича только для Android; на web/iOS модуль не линкуется. */
class PcUploadServerModule extends NativeModule<PcUploadServerModuleEvents> {
  async startAsync(): Promise<StartResult> {
    throw new Error('PcUploadServer доступен только на Android');
  }
  async stopAsync(): Promise<void> {}
}

export default registerWebModule(PcUploadServerModule, 'PcUploadServerModule');
