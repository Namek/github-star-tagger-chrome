class ProjectPage {
  title: string = "Tags"

  constructor(appEl, params) {
    const {user, repo, wasStarred} = params
    const projectName = `${user}/${repo}`

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

    chrome.runtime.sendMessage({type: GET_TAGS, projectName}, tags => {
      taggle.add(tags)
      $d('.taggle_input').focus()
    })

    function getTags() {
      return taggle.getTags().values
    }

    function save() {
      chrome.runtime.sendMessage({
        type: SAVE_TAGS,
        projectName,
        tags: getTags()
      })
    }
  }
}

class StarsPage {
  title = "Stars"
  textFilter = ''
  filter = ''
  sortBy = 'name'
  repos = [] as IUserProject[]
  filteredRepos = [] as IUserProject[]

  constructor({username}) {
    chrome.runtime.sendMessage({type: GET_ALL_USER_PROJECTS, username}, repos => {
      this.repos = repos
      this.refreshFiltering()
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
    const textFilter = this.textFilter
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
      els = els.filter(el => el.projectName.indexOf(textFilter) >= 0)
    }

    if (sortBy) {
      let sortFn
      if (sortBy == 'name') {
        sortFn = (a, b) => a.projectName.localeCompare(b.projectName)
      }
      else if (sortBy == 'tagCount') {
        sortFn = (a, b) => {
          const bl = (b.tags ? b.tags.length : 0)
          const al = (a.tags ? a.tags.length : 0)

          if (bl !== 0 || al !== 0)
            return bl - al

          // when both items have no tags, then compare them by name
          return a.projectName.localeCompare(b.projectName)
        }
      }
      else
        throw new Error('unknown sort type: ${sortBy}')

      els.sort(sortFn)
    }

    return els
  }

  toggleTag = (repo) => {
    repo.isExpanded = !repo.isExpanded
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


  isOnGitHubProjectPage().then(({user, repo}: IUserProject) => {
    executeCode(() => {
      let btn = document.querySelector('form.unstarred button') as HTMLElement
      let isStarred = !btn.offsetHeight

      if (btn && !isStarred) {
        // TODO this works but makes too much noise in network
        // btn.click()
      }

      return isStarred
    })
    .then(wasStarred => {
      const appEl = $id('app-project')
      const app = new ProjectPage(appEl, {user, repo, wasStarred})
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
