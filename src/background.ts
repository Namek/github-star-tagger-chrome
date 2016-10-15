const ICON_NORMAL = 'img/icon.png'
const ICON_STARRED = 'img/icon_starred.png'

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log(request)

  if (request.type == REFRESH_BADGE) {
    let text = request.count !== undefined ? '' + request.count : ''
    chrome.browserAction.setBadgeText({ text });
  }
  else if (request.type == GET_TAGS) {
    storage.getProjectTags(request.name).then(sendResponse)
    return true
  }
  else if (request.type == GET_ALL_USER_PROJECTS) {
    getAllUserProjects(request.username).then(repos => {
      refreshState()
      sendResponse(repos)
    })
    return true
  }
  else if (request.type == SAVE_TAGS) {
    const {name, tags} = request

    storage.setProjectTags(name, tags).then(() => {
      // we also need to update cache!
      let cachedRepos: IRepo[] = cache.get(CACHE_ALL_REPOS)
      if (!!cachedRepos) {
        for (let repo of cachedRepos) {
          if (repo.name == name) {
            repo.tags = tags
            break
          }
        }
      }
      refreshState()
    })
  }
  else if (request.type == JUST_STARRED) {
    // just for a moment...
    setIconToStarred()
  }
  else {
    console.error(`unknown message: ${JSON.stringify(request)}`)
  }
})

chrome.tabs.onActivated.addListener(tab => {
  refreshState()
})

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!!changeInfo.url) {
    refreshState()
  }
})


function refreshState() {
  chrome.tabs.query({active: true, currentWindow: true}, ([tab]) => {
    const repo = isProjectPage(tab.url) as IUserProject

    if (!!repo) {
      storage.getProjectTagCount(`${repo.user}/${repo.project}`)
        .then(tagCount => {
          refreshIcon(true, `${tagCount}`)
        })
    }
    else if (isStarsPage(tab.url)) {
      getStarPageUsername()
        .then(username => {
          getAllUserProjects(username).then((repos) => {
            refreshIcon(false, `${repos.length}`)
          })
        })
    }
    else {
      refreshIcon(false, '')
    }
  })
}

function refreshIcon(isProject: boolean, text: string = '') {
  const color = isProject ? [190, 190, 190, 230]/*gray*/ : [255, 160, 0, 230]/*yellow*/
  chrome.browserAction.setBadgeBackgroundColor({color})
  chrome.browserAction.setBadgeText({ text })

  chrome.browserAction.setIcon({
    path: ICON_NORMAL
  })
}

function setIconToStarred() {
  console.log('starrr!!!1')
  chrome.browserAction.setIcon({
    path: ICON_STARRED
  })
}
