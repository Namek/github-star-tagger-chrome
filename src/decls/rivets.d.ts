declare interface Rivets {
  formatters: any
  binders: {[binder: string]: (el, ...values) => void}
  bind(el: HTMLElement, viewModel: any)
  configure(options: any)
}

declare var rivets: Rivets
