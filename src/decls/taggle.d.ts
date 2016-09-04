declare interface Taggle {
  new(el: HTMLElement, options?: any): Taggle
  setOptions(options: any)

  getTags(): {values: string[], elements: HTMLElement[]}
  getTagValues(): string[]
  getTagElements(): HTMLElement[]
  getInput(): HTMLInputElement
  getContainer(): HTMLElement
  
  add(tag: string): void
  add(tags: string[]): void
  removeAll(): void
  remove(tag: string, removeAll?: boolean)
}

declare var Taggle: Taggle