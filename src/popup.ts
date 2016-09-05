class ProjectPage {
  title: string = "Tags"

  constructor(appEl, params) {
    const {user, project, wasStarred} = params
    const name = `${user}/${project}`

    let tagsEl = $d(appEl, '.tags')
    let taggle = new Taggle(tagsEl, {
      duplicateTagClass: 'bounce',
      onTagAdd: (evt, tag) => {
        save()
      },
      onTagRemove: (evt, tag) => {
        save()
      }
    })

    chrome.runtime.sendMessage({type: GET_TAGS, name}, tags => {
      taggle.add(tags)
      $d('.taggle_input').focus()
    })

    function save() {
      chrome.runtime.sendMessage({
        type: SAVE_TAGS,
        name,
        tags: taggle.getTags().values
      })
    }
  }
}

class StarsPage {
  title = "Stars"
  textFilter = ''
  filter = ''
  sortBy = 'name'
  repos = [] as IRepo[]
  filteredRepos = [] as IRepo[]

  constructor({username}) {
    chrome.runtime.sendMessage({type: GET_ALL_USER_PROJECTS, username}, repos => {
      this.repos = repos
      this.refreshFiltering()

      $id('text-filter').focus()
    })
  }

  refreshFiltering = () => {
    this.filteredRepos = this.filterAndSort(this.repos)
  }

  getFilter(filter) {
    if (filter == 'tagged')
      return el => el.isTagged
    else if (filter == 'untagged')
      return el => !el.isTagged
    else
      throw new Error(`unknown filter type: ${filter}`)
  }

  filterAndSort(els) {
    const filter = this.filter
    let textFilter = this.textFilter
    const sortBy = this.sortBy

    let shouldFilter = filter || textFilter

    if (!sortBy && !shouldFilter) {
      return els
    }

    els = [].concat(els)

    if (filter) {
      els = els.filter(this.getFilter(filter))
    }

    if (!!textFilter) {
      let {tags, words} = textFilter.split(' ')
        .map(t => t.trim())
        .reduce((state, el, i, els) => {
          const isTag = el[0] == '#'
          state[isTag ? 'tags' : 'words'].push(isTag ? el.substr(1) : el)
          return state
        }, {tags: [], words: []})

      els = els.filter(el =>
        words.every(w => el.name.indexOf(w) >= 0)
          && tags.every(t => el.tags.indexOf(t) >= 0)
      )
    }

    if (sortBy) {
      let sortFn
      if (sortBy == 'name') {
        sortFn = (a, b) => a.name.localeCompare(b.name)
      }
      else if (sortBy == 'tagCount') {
        sortFn = (a, b) => {
          const bl = (b.tags ? b.tags.length : 0)
          const al = (a.tags ? a.tags.length : 0)

          if (bl !== 0 || al !== 0)
            return bl - al

          // when both items have no tags, then compare them by name
          return a.name.localeCompare(b.name)
        }
      }
      else
        throw new Error('unknown sort type: ${sortBy}')

      els.sort(sortFn)
    }

    return els
  }

  toggleRepo = (repo) => {
    repo.isExpanded = !repo.isExpanded
  }

  saveRepoTags = (evt: CustomEvent, that: StarsPage) => {
    const {name, tags} = evt.detail

    chrome.runtime.sendMessage({
      type: SAVE_TAGS,
      name,
      tags
    })

    for (let repo of that.repos) {
      if (repo.name == name) {
        repo.tags = tags
        break
      }
    }
  }
}

class UnknownPage {
  constructor() {

  }
}

document.addEventListener('DOMContentLoaded', function() {
  rivets.formatters['equals'] = (val, expectedVal) => val == expectedVal
  rivets.formatters['not'] = val => !val
  rivets.formatters['length'] = val => val.length
  rivets.formatters['append'] = (val, arg) => val + arg
  rivets.formatters.args = function(fn) {
    let args = Array.prototype.slice.call(arguments, 1)
    return () => fn.apply(null, args)
  }

  // replace '*' binder with 'attr-*' for improved readability in HTML + finding wrong bindings
  rivets.binders['*'] = function() {
    console.warn("Unknown binder: " + this.type);
  }
  rivets.binders['attr-*'] = function(el, value) {
    const attrToSet = this.type.substring(this.type.indexOf('-') + 1)

    if (value || value === 0) {
      el.setAttribute(attrToSet, value);
    }
    else {
      el.removeAttribute(attrToSet);
    }
  }

  rivets.binders['repo-taggle'] = function(el, repo) {
    // Note: `rv-if` doesn't really delete elements, it rather removes them
    // from DOM and brings back in the same state later.
    // That's why we need to remove all children elements
    // before initializing Taggle again.
    while (!!el.firstChild) {
      el.removeChild(el.firstChild)
    }

    const name = repo.name
    const tags = [].concat(repo.tags || [])

    const taggle = new Taggle(el, {
      tags,
      duplicateTagClass: 'bounce',
      onTagAdd: (evt, tag) => {
        notifyUpdate()
      },
      onTagRemove: (evt, tag) => {
        notifyUpdate()
      }
    })

    setTimeout(() => {
      $d(el, '.taggle_input').focus()
    })

    function notifyUpdate() {
      const tags = taggle.getTagValues()

      let evt = new CustomEvent('retagged', {detail: {name, tags}})
      el.dispatchEvent(evt)
    }
  }


  isOnGitHubProjectPage().then(({user, project}: IUserProject) => {
    executeCode(() => {
      let btn = document.querySelector('form.unstarred button') as HTMLElement
      let isStarred = !btn.offsetHeight
      let wasStarred = isStarred
      let justStarred = false

      if (btn && !isStarred) {
        btn.click()
        isStarred = justStarred = true
      }

      return {justStarred, wasStarred, isStarred}
    })
    .then(({justStarred, wasStarred, isStarred}) => {
      if (justStarred) {
        chrome.runtime.sendMessage({
          type: JUST_STARRED
        })
      }

      const appEl = $id('app-project')
      const app = new ProjectPage(appEl, {user, project, wasStarred})
      rivets.bind(appEl, app)
    })
  }, () => {
    isOnGitHubMyStarsPage().then(() => {
      getStarPageUsername().then(username => {
        rivets.bind($id('app-stars'), new StarsPage({username}))
      })
    }, () => {
      rivets.bind($id('app-unknown'), new UnknownPage)
    })
  })
})


function isOnGitHubProjectPage(): Promise<IUserProject> {
  var queryInfo = {
    active: true,
    currentWindow: true
  }

  return new Promise((resolve, reject) => {
    chrome.tabs.query(queryInfo, tabs => {
      let tab = tabs[0]
      let result = isProjectPage(tab.url)

      if (!!result)
        resolve(result as IUserProject)
      else
        reject()
    })
  })
}

function isOnGitHubMyStarsPage() {
  var queryInfo = {
    active: true,
    currentWindow: true
  }

  return new Promise((resolve, reject) => {
    chrome.tabs.query(queryInfo, tabs => {
      let tab = tabs[0]
      if (isStarsPage(tab.url))
        resolve()
      else
        reject()
    })
  })
}

function log(text) {
  let el = document.createElement('div')
  try {
    text = typeof (text) == 'object' ? JSON.stringify(text) : text
  }
  catch (err) {}
  el.textContent = ''+text
  $id('logs').appendChild(el)
}
