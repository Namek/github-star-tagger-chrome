chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log(request)

  if (request.type == REFRESH_BADGE) {
    let text = request.count !== undefined ? '' + request.count : ''
    chrome.browserAction.setBadgeText({ text });
  }
  else if (request.type == GET_TAGS) {
    storage.getProjectTags(request.projectName).then(sendResponse)
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
    const {projectName, tags} = request

    storage.setProjectTags(projectName, tags).then(() => {
      // we also need to update cache!
      cache.get(CACHE_ALL_REPOS).then((repos: IUserProject[]) => {
        for (let repo of repos) {
          if (repo.projectName == projectName) {
            repo.tags = tags
            break
          }
        }

        refreshState()
      })
    })
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
    let project = isProjectPage(tab.url) as IUserProject
    if (!!project) {
      storage.getProjectTagCount(`${project.user}/${project.repo}`)
        .then(tagCount => {
          refreshBadge(true, `${tagCount}`)
        })
    }
    else if (isStarsPage(tab.url)) {
      getStarPageUsername().then(username => {
        getAllUserProjects(username).then((repos) => {
          refreshBadge(false, `${repos.length}`)
        })
      })
    }
    else {
      refreshBadge(false, '')
    }
  })
}

function refreshBadge(isProject, text = '') {
  const color = isProject ? [190, 190, 190, 230]/*gray*/ : [255, 160, 0, 230]/*yellow*/
  chrome.browserAction.setBadgeBackgroundColor({color})

  console.log(`badge: ${text}`)
  chrome.browserAction.setBadgeText({ text });
}
