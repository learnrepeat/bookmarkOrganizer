init();

async function init() {
	const bookmarkTreeNode = await getTreePromise();
	const foldersAndPages = getFoldersAndPages(bookmarkTreeNode);

	const defaultFolderData = await getLocalStorage("defaultFolderId");
	let defaultFolderId = defaultFolderData.defaultFolderId != null ? defaultFolderData.defaultFolderId : 2;
	createDefaultSelectionMenu(foldersAndPages.folders, defaultFolderId);

	$("#unsortedBookmark-dropdown").change(function () {
		defaultFolderId = this.value;
		saveDefaultFolderId(defaultFolderId);
	})

	$("#saveOptions").click(function() {
		const defaultPage = $("#defaultPageUrl").val();
		saveDefaultRedirect(defaultPage);
		window.close();
	})
}

function getTreePromise() {
	return new Promise(resolve => {
		chrome.bookmarks.getTree((bookmarkTreeNode) => {
			resolve(bookmarkTreeNode);
		});
	});
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

function saveDefaultRedirect(url) {
	chrome.storage.local.set({
		'defaultPageUrl': url
	});
}

function saveDefaultFolderId(defaultFolderId) {
	chrome.storage.local.set({
		'defaultFolderId': defaultFolderId
	});
}

function getLocalStorage(keyName) {
	return new Promise(resolve => {
		chrome.storage.local.get(keyName, (items) => {
			resolve(items);
		});
	});
}