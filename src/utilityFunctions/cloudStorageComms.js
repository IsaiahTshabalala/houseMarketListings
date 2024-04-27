import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "../config/appConfig";

export async function uploadFiles(toFolder, filesToUpload, uploadStatusPoster) {
    /**toFolder: folder on which to perform upload.
     * filesToUpload: File instance objects representing files to upload.
     * uploadStatusPoster: function to be called to send the upload stataus.
     */
    if (filesToUpload.length === 0)
        return Promise.resolve({}); // The filesToUpload array was empty, so nothing was done.
    
    let count = 0;
    let totalFiles = uploadFiles.length;
    const downloadUrls = [];
    const errors = [];
    const failedFiles = [];
    const succeededFiles = [];


    const aPromise = new Promise((resolve, reject)=> {
        filesToUpload.forEach(async file=> {
            if (errors.length > 0) // Do not continue on encountering your first upload error.
                return;
            
            const toFullPath = (toFolder + '/' + file.name).replace('//', '/');
            const storageRef = ref(storage, toFullPath);    
            const uploadTask = uploadBytesResumable(storageRef, file);

            // Register three observers:
            // 1. 'state_changed' observer, called any time the state changes.
            // 2. Error observer, called on failure.
            // 3. Completion observer, called on successful completion.
            uploadTask.on('state_changed', 
                 (snapshot) => {
                    // Observe state change events such as progress, pause, and resume
                    // Get task progress, including the number of bytes uploaded and the total number of bytes to be uploaded
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    uploadStatusPoster('File ' + count + ' of ' +  totalFiles + ' ... Upload is ' + progress + '% done');
                    switch (snapshot.state) {
                        case 'paused':
                            uploadStatusPoster('Upload is paused');
                            break;
                        case 'running':
                            uploadStatusPoster('Upload is running');
                            break;
                    } // switch (snapshot.state) {
                }, // (snapshot) => {
                (error) => {
                    const message = error.status + ' ' + (error.serverResponse === null? '' : error.serverResponse);
                    errors.push(message);       
                    failedFiles.push(file);
                    count++;
                    if (count === filesToUpload.length) // No more images to process
                        resolve({toFolder, errors, failedFiles, succeededFiles, downloadUrls});
                }, // (error) => {
                () => {
                    // Handle successful uploads on complete
                    // For instance, get the download URL: https://firebasestorage.googleapis.com/...
                    getDownloadURL(uploadTask.snapshot.ref).then(downloadUrl=> {
                        downloadUrls.push(downloadUrl);
                        succeededFiles.push(file);
                        count++;
                        if (count === filesToUpload.length)  {  // No more images to process
                            resolve({toFolder, errors, failedFiles, succeededFiles, downloadUrls});
                        }
                    });
                } // () => {
            ); // uploadTask.on('state_changed', 
    
        }); // filesToUpload.forEach(file=> {
    }); // filesToUpload.forEach(async file=> {
    return await aPromise;
} // export function uploadFiles(toFolder, filesToUpload, uploadStatusPoster) {

export async function deleteFileOrFolder(fileOrFolder) {
    const storageRef = ref(storage, fileOrFolder);
    const aPromise = new Promise((resolve, reject)=> {
        try {
            // Delete the file
            deleteObject(storageRef);
            resolve(fileOrFolder);
        } catch (error) {
            const message = error.status + (error.serverResponse === null? '' : error.serverResponse);
            reject({message, failedFileOrFolder: fileOrFolder});
        }
    }); // const aPromise = new Promise((resolve, reject)=> {
    return await aPromise;
} // export async function deleteFileOrFolder(fileOrFolder) {

export async function deleteFiles(filesToDelete) {
    /**
     * folder: folder on the Cloud storage, on which to delete files.
     * filesToDelete: array of files (name plus extension) to delete.
     */
    if (filesToDelete.length === 0)
        return Promise.resolve({});

    const deletedFiles = [];
    const failedDeletions = [];
    const errors = [];

    filesToDelete.forEach(async (file)=> {
        const fullPath = file.url;
        try {
            await deleteFileOrFolder(fullPath);
            deletedFiles.push(file);
        } catch(error) {
            errors.push(error.message);
            failedDeletions.push(error.failedFileOrFolder);
        } // else {
    }); // filesToDelete.forEach(async (file)=> {


    return Promise.resolve({deletedFiles, failedDeletions, errors});
} // export async function deleteFiles(folder, filesToDelete) {

export function allowedListingImageSize(file) {
    return file.size <= 1024 * 1024;
} // export function allowedListingImageSize(file) {

/* 
export async function listFiles(folder) {
    const storage = getStorage();

    // Create a reference under which you want to list
    const listRef = ref(storage, folder);
    console.log(folder);

    // Find all the prefixes and items.
    await listAll(listRef)
        .then(res=> console.log(res))
        .catch(error=> console.log(error));
} // export function listFiles(folder) { */