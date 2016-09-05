// actions
const REFRESH_BADGE = 'refresh_badge'
const SAVE_TAGS = 'save_tags'

// data requests
const GET_TAGS = 'get_tags'
const GET_ALL_USER_PROJECTS = 'get_all_user_projects'

// cache
const CACHE_ALL_REPOS = 'all_repos'

declare interface IUserProject {
  user: string
  project: string
}

declare interface IRepo extends IUserProject {
  name?: string
  language?: string
  tags?: string[]
  isTagged?: boolean
}


function isStarsPage(tabUrl: string) {
  return /^https?:\/\/(www\.)?github.com\/stars(\?.*)?$/.test(tabUrl)
}

function isProjectPage(tabUrl: string): IUserProject {
  let match = ('' + tabUrl).match(/^https?:\/\/(www\.)?github.com\/([^\/]+)\/([^\/]+)/)

  if (match && match.length === 4 && match[0] && match[2] && match[3]) {
    return {
      user: match[2],
      project: match[3]
    } as IUserProject
  }
  else {
    return null
  }
}

class DataStorage {
  loaded: Promise<{}>
  projects: any

  constructor() {
    this.loaded = new Promise((resolve, reject) => {
      try {
        chrome.storage.local.get(null, projects => {
          this.projects = projects || {}
          resolve()
        })
      }
      catch (err) {
        reject(err)
      }
    })
  }

  save() {
    return this.loaded.then(() => {
      chrome.storage.local.set(this.projects, () => {
        // cool, do nothing
      })
    })
  }

  getProject(name) {
    return this.loaded.then(() => {
      let project = this.projects[name]

      if (!project) {
        project = this.projects[name] = {tags: []}
      }
      return project
    })
  }

  getAllProjects() {
    return this.loaded.then(() => this.projects)
  }

  getProjectTags(name) {
    return this.loaded.then(() =>
      this.getProject(name)
        .then(project => project.tags || [])
    )
  }

  getProjectTagCount(name) {
    return this.loaded.then(() =>
      this.getProject(name).then(project =>
        project.tags ? project.tags.length : 0
      )
    )
  }

  setProjectTags(name, tags) {
    return this.loaded.then(() =>
      this.getProject(name).then(project => {
        project.tags = tags
        return this.save()
      })
    )
  }
}

class DataCache {
  cache = {}

  get(key) {
    return new Promise((resolve, reject) => {
      try {
        resolve(this.cache[key].val)
      }
      catch (err) {
        resolve(undefined)
      }
    })
  }

  set(key, val) {
    if (!this.cache) {
      this.cache = {}
    }

    this.cache[key] = {val}
  }
}

// both starred and tagged (some could not appear on starred projects list)
function getAllUserProjects(username): Promise<Array<IRepo>> {
  return cache.get(CACHE_ALL_REPOS)
    .then((repos) => {
      if (repos !== undefined)
        return repos

      return new Promise((resolve, reject) =>
        storage.getAllProjects().then(projects => {
          const PER_PAGE = 100
          let pageNo = 0
          let repos = []

          function downloadFurther() {
            pageNo++
            xhrJson('GET', `https://api.github.com/users/${username}/starred?page=${pageNo}&per_page=100`)
              .then((data: any[]) => {
                for (let repo of data) {
                  const name = `${repo.owner.login}/${repo.name}`
                  const project = projects[name]
                  const isTagged = !!project && !!project.tags && project.tags.length > 0
                  repos.push({
                    name,
                    repo: repo.name,
                    user: repo.owner.login,
                    language: repo.language,
                    tags: (project && project.tags) ? project.tags : [],
                    isTagged
                  })
                }

                if (repos.length % PER_PAGE === 0)
                  downloadFurther()
                else
                  resolve(repos)
              })
              .catch(reject)
          }
          downloadFurther()
        })
      ).then(repos => {
        cache.set('all_repos', repos)
        return repos
      })
    })
}

function getStarPageUsername() {
  return executeCode(() => {
    const el = document.querySelector('.header-nav-current-user .css-truncate-target')
    return el.textContent
  })
}

function xhrJson(method, url, data = undefined) {
  return new Promise((resolve, reject) => {
    let x = new XMLHttpRequest()
    x.open(method, url)
    x.responseType = 'json'
    x.onload = () => {
      var response = x.response;
      if (!response) {
        reject('no response')
        return
      }

      resolve(response)
    }
    x.onerror = () => reject('network error')
    x.send()
  })
}

function $d(...args) {
  let query = arguments[arguments.length == 1 ? 0 : 1];
  let el = arguments.length == 1 ? document : arguments[0];
  return el.querySelector(query);
}
function $da() {
  var query = arguments[arguments.length == 1 ? 0 : 1];
  var el = arguments.length == 1 ? document : arguments[0];
  return el.querySelectorAll(query);
}
function $id(id) {
  return document.getElementById(id);
}

function executeCode(func) {
  return new Promise((resolve, reject) => {
    try {
      chrome.tabs.executeScript({
        code: '(' + func.toString() + ')()'
      }, (result) => {
        setTimeout(() => resolve(result))
      })
    } catch (err) {
      setTimeout(() => reject(err))
    }
  })
}



// globals
let storage = new DataStorage
let cache = new DataCache
