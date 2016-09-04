declare interface Chrome {
  runtime: ChromeRuntime
  storage: ChromeStorage
  browser: ChromeBrowser
  tabs: ChromeTabs
  browserAction: ChromeBrowserAction
}

declare interface ChromePlatformInfo {
  os: string
  arch: string
  nacl_arch: string
}

declare interface ChromeRuntime {
  lastError: string
  getPlatformInfo(callback: (platformInfo: ChromePlatformInfo) => void): void
  onMessageExternal: ChromeOnMessage
  onMessage: ChromeOnMessage
  getManifest(): any
  id: string
  sendMessage(extensionId: string, message: any, options: any, responseCallback: (data: any) => void): void
  sendMessage(message: any, options: any, responseCallback: (data: any) => void): void
  sendMessage(message: any, responseCallback?: (data: any) => void): void
}


declare type ChromeStorageItems = { [key:string]: any}
declare type ChromeCallback = () => void

declare interface ChromeStorageArea {
  getBytesInUse(callback: (bytesInUse: number) => void): void
  getBytesInUse(keys: string, callback: (bytesInUse: number) => void): void
  getBytesInUse(keys: string[], callback: (bytesInUse: number) => void): void
  clear(callback?: ChromeCallback): void
  set(items: ChromeStorageItems, callback?: ChromeCallback): void
  remove(keys: string, callback?: ChromeCallback): void
  remove(keys: string[], callback?: ChromeCallback): void
  get(callback: (items: ChromeStorageItems) => void): void
  get(keys: string, callback: (items: ChromeStorageItems) => void): void
  get(keys: string[], callback: (items: ChromeStorageItems) => void): void

  QUOTA_BYTES: number
}

declare interface ChromeStorage {
  local: ChromeStorageArea
}

declare interface ChromeMessageSender {
  tabs?: any
  frameId?: number
  id?: string
  url?: string
  tlsChanelId?: string
}

declare interface ChromeOnMessage {
  addListener: (
    callback: (
      message: any, sender:ChromeMessageSender, sendResponse: (
        response: any
      ) => void
    ) => boolean
  ) => void
}

declare interface ChromeBrowser {
  // according to specification, callback is optional, but in reality it's mandatory (as of now)
  openTab: (options: {url: string}, callback: () => void) => void
}

declare interface ScriptExecutionDetails {
  code?: string
  file?: string
  allFrames?: boolean
  frameId?: number
  matchAboutBlank?: boolean
  runAt?: 'document_start' | 'document_end' | 'document_idle'
}

declare interface ChromeTab {
  tabId?: number
  url?: string
}

declare interface ChromeTabActiveInfo {
  // TODO ??
}

declare interface ChromeTabQueryInfo {

}

declare interface ChromeTabs {
  executeScript(tabId: number, details: ScriptExecutionDetails, callback: Function): void
  executeScript(details: ScriptExecutionDetails, callback: Function): void;
  query(queryInfo: ChromeTabQueryInfo, callback: Function): void

  onActivated: { addListener(callback: (tabId: number, changeInfo: any, tab: ChromeTab) => void): void };
  onUpdated: { addListener(callback: Function): void };
}

declare interface ChromeBrowserAction {
  setBadgeText({text: string})
  setBadgeBackgroundColor({color: Array})
}

declare var chrome: Chrome
