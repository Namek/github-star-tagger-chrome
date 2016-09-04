declare interface Rivets {
  formatters: any
  bind(el: HTMLElement, viewModel: any)
  configure(options: any)
}

declare var rivets: Rivets