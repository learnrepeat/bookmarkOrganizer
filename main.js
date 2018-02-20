
const sortedBookmarkContainerId = "#sortedBookmarkContainer";
let foldersAndPages;

init();	


async function init() {
	const bookmarkTreeNode = await getTreePromise();
	foldersAndPages = getFoldersAndPages(bookmarkTreeNode);
	const folderOrder = await getFolderOrder();
	const defaultFolderData = await getLocalStorage("defaultFolderId");
	let defaultFolderId = defaultFolderData.defaultFolderId != null ? defaultFolderData.defaultFolderId : 2;

	const containsData = doesFolderContainsData(foldersAndPages.pages, defaultFolderId);
	if (!containsData) {
		let redirect = "http://google.com/ig";
		let redirectData = await getLocalStorage("defaultPageUrl");
		
		if(redirectData.defaultPageUrl != null) {
			redirect = redirectData.defaultPageUrl;
		}

		redirect = redirect.indexOf("http://") == -1 ? "http://" + redirect : redirect;
		window.location.href = redirect;
		return;
	}

	createFolderDivs(foldersAndPages.folders, folderOrder, defaultFolderId);
	createPageDivs(foldersAndPages.pages, defaultFolderId);
	addRandomFaviconColors(foldersAndPages.pages);

	setDefaultFolder(defaultFolderId, foldersAndPages.pages);
	createDefaultSelectionMenu(foldersAndPages.folders, defaultFolderId);
	makeDivsSortable();

	$("#unsortedBookmark-dropdown").change(function () {
		const prevDefaultId = defaultFolderId;
		defaultFolderId = this.value;

		saveDefaultFolderId(defaultFolderId);
		setDefaultFolder(defaultFolderId, foldersAndPages.pages);
		updateDefaultFolderDiv(prevDefaultId, defaultFolderId, foldersAndPages, folderOrder);
	})

	$("#addFolder").click(() => {
		const modal = document.getElementById('myModal');
		modal.style.display = "block";

		var span = document.getElementsByClassName("close")[0];

		span.onclick = function() {
		    modal.style.display = "none";
		}

		window.onclick = function(event) {
		    if (event.target == modal) {
		        modal.style.display = "none";
		    }
		}

		$("#saveFolder").click(() => {
			const title = $("#folderTitle").val();
			addFolderClick(title);
			modal.style.display = "none";
		});
	});
}

async function addFolderClick(title) {
	const newFolder = await createNewFolder(title);
	foldersAndPages.folders.push(newFolder);
	addNewFolder(newFolder);
}

function doesFolderContainsData(pagesTrees, defaultFolderId) {
	for (var i=0; i<pagesTrees.length; i++) {
		if(pagesTrees[i].parentId == defaultFolderId) {
			return true;
		}
	}

	return false;
}


function saveDefaultFolderId(defaultFolderId) {
	chrome.storage.local.set({
		'defaultFolderId': defaultFolderId
	});
}

function addNewFolder(bookmarkTreeNode) {
	let folderDiv = 
		`<div class="bookmarkFolders" id="bookmarkFolders-${bookmarkTreeNode.id}">  \
			<div class="bookmarkFoldersHeader"> \
				${bookmarkTreeNode.title} \
			</div> \
			<ul class="bookmarkFoldersList" id="bookmarkFoldersList-${bookmarkTreeNode.id}"> \
			</ul> \
		</div>`;

	$(sortedBookmarkContainerId).append(folderDiv);
	makeDivsSortable();
}

function updateDefaultFolderDiv(prevDefaultId, defaultFolderId, foldersAndPages, folderOrder) {
	const folderTrees = foldersAndPages.folders;

	for (var i=0; i<folderTrees.length; i++) {
		let folderId = folderTrees[i].id;
		if(folderId != prevDefaultId) {
			continue;
		}

		let folderDiv = 
			`<div class="bookmarkFolders" id="bookmarkFolders-${folderId}">  \
				<div class="bookmarkFoldersHeader"> \
					${folderTrees[i].title} \
				</div> \
				<ul class="bookmarkFoldersList" id="bookmarkFoldersList-${folderId}"> \
				</ul> \
			</div>`;

		$(sortedBookmarkContainerId).append(folderDiv);
	}

	makeDivsSortable();
}

function makeDivsSortable(){
	$( ".sortedBookmarkContainer" ).sortable({
		stop: function( event, ui ) {
			const currentFolderElements = event.target.children;
			currentFolderIds = getIdsFromElements(currentFolderElements);
			saveFolderOrder(currentFolderIds);
			getFolderOrder();
      	}
    });

    $( ".unsortedList" ).sortable({
	  placeholder: "bookmarkPage-placeholder",
      connectWith: ".bookmarkFoldersList",
      update: stopUnsortedPageUpdate
  	});

	$( ".bookmarkFoldersList" ).sortable({
	  placeholder: "bookmarkPage-placeholder",
      connectWith: ".bookmarkFoldersList",
      start: startPageUpdate,
      stop: stopPageUpdate
    });

	$( ".unsortedBookmarkFolder" ).disableSelection();
	$( ".sortedBookmarkContainer" ).disableSelection();

	function startPageUpdate(event, ui) {
		const pageId = event.originalEvent.target.id.split("-").pop();
      	const bookmarkIds = getIdsFromElements(event.originalEvent.target.parentElement.children);
    }

    function stopUnsortedPageUpdate(event, ui) {
    	const pageId = ui.item[0].id;
    	const newFolder = $("#" + pageId).parents()[0].id;
    	const bookmarkIds = getIdsFromElements($("#" + newFolder).children());
    	const bookmarkIndex = bookmarkIds.indexOf(pageId.split("-").pop()) > -1 ? bookmarkIds.indexOf(pageId.split("-").pop()) : 0;


    	$("#" + pageId).removeClass("unsorted");
    	updateBookmarkPage(pageId.split("-").pop(), newFolder.split("-").pop(), bookmarkIndex);
    }

	function stopPageUpdate(event, ui) {
		const pageId = event.originalEvent.target.id.split("-").pop();	
      	const newFolder = event.originalEvent.target.parentElement.id.split("-").pop();
      	const bookmarkIds = getIdsFromElements(event.originalEvent.target.parentElement.children);
      	const bookmarkIndex = bookmarkIds.indexOf(pageId.split("-").pop()) > -1 ? bookmarkIds.indexOf(pageId.split("-").pop()) : 0;

      	updateBookmarkPage(pageId, newFolder, bookmarkIndex);
	}
}

function updateBookmarkPage(pageId, newFolder, bookmarkIndex) {
  	chrome.bookmarks.move(pageId, {parentId: newFolder, index: bookmarkIndex});
}

function getFoldersAndPages(bookmarkTreeNode) {
	const foldersAndPages = {};
	foldersAndPages.pages = [];
	foldersAndPages.folders = [];
	
	recursiveSort(bookmarkTreeNode);

	//remove the root bookmark folder since it can't be modified
	foldersAndPages.folders = foldersAndPages.folders.slice(1);
	return foldersAndPages;

	function recursiveSort(bookmarkTreeNode) {
		let bookmarkNode;

		for(var i=0; i<bookmarkTreeNode.length; i++){
			bookmarkNode = bookmarkTreeNode[i];
			
			if(!bookmarkNode.children) {
				foldersAndPages.pages.push(bookmarkNode);
				continue;
			}

			//adds the bookmark node to folders and sets children property to null since we won't need it
			foldersAndPages.folders.push({...bookmarkNode, children:null});
			recursiveSort(bookmarkNode.children);
		}
	}
}

function createFolderDivs(folderTrees, sortIdOrder, defaultFolderId) {
	const folderDivs = {};

	for (var i=0; i<folderTrees.length; i++) {
		let folderId = folderTrees[i].id;

		if(folderId == defaultFolderId) {
			continue;
		}

		let folderDiv = 
			`<div class="bookmarkFolders" id="bookmarkFolders-${folderId}">  \
				<div class="bookmarkFoldersHeader"> \
					${folderTrees[i].title} \
				</div> \
				<ul class="bookmarkFoldersList" id="bookmarkFoldersList-${folderId}"> \
				</ul> \
			</div>`;

		folderDivs[folderId] = folderDiv;
		if(sortIdOrder.indexOf(folderId) === -1) {
			sortIdOrder.push(folderId);
		}
	}

	sortIdOrder.forEach(folderId => {
		$(sortedBookmarkContainerId).append(folderDivs[folderId]);
	})
}

function createPageDivs(pagesTrees, defaultFolderId) {
	let bookmark;
	let pageDiv;
	for (var i=0; i<pagesTrees.length; i++) {
		bookmark = pagesTrees[i];

		if(bookmark.parentId == defaultFolderId) {
			continue;
		}

		pageDiv = `<li class="bookmarkPages" id="bookmarkPages-${bookmark.id}">  \
				<div class="favicon" id="favicon-${bookmark.id}"></div>
				${bookmark.title} \
			</li>`;

		$(`#bookmarkFoldersList-${bookmark.parentId}`).append(pageDiv);
	}
}

function createDefaultSelectionMenu(folderTrees, defaultFolderId) {
	let folder;
	const bufferDivs = [];

	for (var i=0; i<folderTrees.length; i++) {
		folder = folderTrees[i];
		folderDiv = `<option value="${folder.id}">  \
				${folder.title} \
			</option>`;

		//we want to append the default option first, then the others
		if (folder.id != defaultFolderId) {
			bufferDivs.push(folderDiv);
			continue;
		}

		$("#unsortedBookmark-dropdown").append(folderDiv);
	}

	bufferDivs.forEach(div => {
		$("#unsortedBookmark-dropdown").append(div);
	});

}

function addRandomFaviconColors(pagesTrees) {
	const colors = ["blue", "green"]
	let randomNumber;

	for (var i=0; i<pagesTrees.length; i++) {
		bookmark = pagesTrees[i];
		randomNumber = getRandomNumber(0, colors.length-1);
		$(`#favicon-${bookmark.id}`).css("background-color",colors[randomNumber]);
	}

	function getRandomNumber(min, max) {
    	return Math.floor(Math.random() * (max - min + 1)) + min;
	}
}

function setDefaultFolder(defaultFolderId, pagesTrees) {
	let bookmarkObj;
	$(".unsortedList").empty();
	$( "#bookmarkFolders-" + defaultFolderId ).remove();

	for (var i=0; i<pagesTrees.length; i++) {
		bookmarkObj = pagesTrees[i];

		if(bookmarkObj.parentId != defaultFolderId) {
			continue;
		}

		pageDiv = `<li class="bookmarkPages unsorted" id="bookmarkPages-${bookmarkObj.id}">  \
				${bookmarkObj.title} \
			</li>`;

		$(".unsortedList").append(pageDiv);
	}
}

function getIdsFromElements(currentFolderElements) {
	const ids = [];
	for(var i=0; i< currentFolderElements.length; i++) {
		ids.push(currentFolderElements[i].id.split("-").pop());
	}

	return ids;
}

function saveFolderOrder(ids) {
	chrome.storage.local.set({
		'folderOrder': ids
	});
}

/*
	Helper Promise Functions
	Creates Promise versions of chrome api, so we don't have to use callbacks
*/

function getLocalStorage(keyName) {
	return new Promise(resolve => {
		chrome.storage.local.get(keyName, (items) => {
			resolve(items);
		});
	});
}

function getTreePromise() {
	return new Promise(resolve => {
		chrome.bookmarks.getTree((bookmarkTreeNode) => {
			resolve(bookmarkTreeNode);
		});
	});
}

function getFolderOrder() {
	return new Promise(resolve => {
		chrome.storage.local.get('folderOrder', function(result) {
			if (result.folderOrder == null) {
				result.folderOrder = [];
			}

			resolve(result.folderOrder);
	  	});
	});
}

function createNewFolder(title) {
	if (!title) {
		return;
	}

	return new Promise(resolve => {
		chrome.bookmarks.create({title: title}, (bookmarkTreeNode) => {
			resolve(bookmarkTreeNode);
		});
	});
}