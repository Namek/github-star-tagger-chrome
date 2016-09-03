class ProjectPage {
  constructor(appEl, params) {
    this.title = "Tags"
    const {user, project, wasStarred} = params
    const projectName = `${user}/${project}`

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
  constructor({username}) {
    this.title = "Stars"
    this.filter = ''
    this.sortBy = 'name'
    this.filteredRepos = []

    chrome.runtime.sendMessage({type: GET_ALL_USER_PROJECTS, username}, repos => {
      this.repos = repos
      this.refreshFiltering()
    })
  }

  refreshFiltering() {
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

    let wasFiltered = filter || textFilter

    if (filter) {
      els = els.filter(this.getFilter(filter))
    }

    if (!!textFilter) {
      els = els.filter(el => el.projectName.indexOf(textFilter) >= 0)
    }

    if (sortBy) {
      if (wasFiltered) {
        // create new array for sorting to prevent mutation of original array
        els = [].concat(els)
      }

      let sortFn
      if (sortBy == 'name') {
        sortFn = (a, b) => a.projectName.localeCompare(b.projectName)
      }
      else if (sortBy == 'tagCount') {
        sortFn = (a, b) =>
          (a.tags ? a.tags.length : 0) > (b.tags ? b.tags.length : 0)
      }
      else
        throw new Error('unknown sort type: ${sortBy}')
      
      els.sort(sortFn)
    }

    return els
  }

  toggleTag(repo) {
    log('taaaggg!')
    log(repo)
  }
}

class UnknownPage {
  constructor() {
    
  }
}

document.addEventListener('DOMContentLoaded', function() {
  rivets.formatters['not'] = (val) => !val
  rivets.formatters['length'] = val => val.length 

  rivets.configure({
    handler: function(context, ev, binding) {
      return this.call(binding.view.models, context, ev)
    }
  })


  isOnGitHubProjectPage().then(({user, project}) => {
    executeCode(() => {
      let btn = document.querySelector('form.unstarred button')
      let isStarred = !btn.offsetHeight

      if (btn && !isStarred) {
        // TODO this works but makes too much noise in network
        // btn.click()
      }

      return isStarred
    })
    .then(wasStarred => {
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


function isOnGitHubProjectPage(callback) {
  var queryInfo = {
    active: true,
    currentWindow: true
  }

  return new Promise((resolve, reject) => {
    chrome.tabs.query(queryInfo, tabs => {
      let tab = tabs[0]
      let result = isProjectPage(tab.url)

      if (!!result)
        resolve(result)
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

