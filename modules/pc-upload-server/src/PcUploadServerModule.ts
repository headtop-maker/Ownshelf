import { NativeModule, requireNativeModule } from 'expo';

import type { PcUploadServerModuleEvents, StartResult } from './PcUploadServer.types';

declare class PcUploadServerModule extends NativeModule<PcUploadServerModuleEvents> {
  startAsync(): Promise<StartResult>;
  stopAsync(): Promise<void>;
}

export default requireNativeModule<PcUploadServerModule>('PcUploadServer');
