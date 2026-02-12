/**
 * File: ./src/components/AddOrEditListing.js
 * Description: Enable creation and update of listings.
 * Start Date  End Date      Dev  Version  Description
 * 2023/12/15                ITA  1.00     Genesis
 * 2024/06/17                ITA  1.01     Add header comment. Rename the component Protected to Registered.
 *                                         Clicked listing state to be updated after addition or update of listing.
 *                                         Rename field docId to listingId.
 * 2024/07/07                ITA  1.02     Move function descriptions to the top, before each function.
 *                                         Remove the sortField from the provinces, municipalities, mainPlace and subPlaces collection items.
 *                                         Instead, use the name field for sorting. In keeping with improvements to the Collections class.
 *                                         Update the listings sharedVar during the addition/update of a listing.
 * 2024/07/14                ITA  1.03     During the update or creation of a listing. The created listing must be placed at the right position on the sharedVar listings array.
 * 2024/08/07                ITA  1.04     Allow map coordinates to be populated optionally.
 * 2024/08/20                ITA  1.05     Indicate the map coordinate fields as optional.
 * 2024/09/18                ITA  1.06     Import context directly. Variable names moved to the VarNames object.
 * 2026/01/03  2026/02/11    ITA  1.07     Dropdowns now imported from dropdowns-js, where they were moved nd refined.
 *                                         useCollectionsContext() no longer used by the dropdowns. Removed
 *                                         Form state data (object) split into smaller slices. So that key strokes cause a re-render to a small portion of the form instead of instead of the entire form, which is large.
 *                                         Improved data validation and editing functionality in keeping up with split state data.
 *                                         Moved a number of utility functions to an external package (some-common-functions-js) for further refinement, and reusability.
 *                                         Replaced loDash object manipulation functions with newly created counterparts in some-common-functions-js.
 */
import { doc, setDoc, Timestamp, deleteField } from 'firebase/firestore';
import { db, auth } from '../config/appConfig.js';
import { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams,  NavLink } from 'react-router-dom';
import { BsTrash3 } from 'react-icons/bs';
import { BiSolidError } from 'react-icons/bi';
import { MdCancel } from 'react-icons/md';
import { IoMdAttach } from "react-icons/io";
import { Dropdown, DropdownObj } from 'dropdowns-js';
import { ToastContainer, toast } from 'react-toastify';
import toastifyTheme from './toastifyTheme.js';
import { v4 as uuidv4} from 'uuid';
import { Link } from 'react-router-dom';
import FieldError from './FieldError.jsx';
import EditField from './EditField.jsx'
import 'dropdowns-js/style.css';

import { objectFromFile, hasValues,
         isValidDescription, isValidShortDescription, isValidStreetNo,
         isValidNumBedrooms, isValidNaturalNumber,
         isValidPositiveDecimalNumber, isValidDecimalNumber,
         fileSizeMiB } from '../utilityFunctions/commonFunctions.js';
import { isValidName, deepClone, objCompare, timeStampString, binarySearchObj,
         get, set, unset, getPaths,
         timeStampYyyyMmDd} from "some-common-functions-js";
import { useBackupStore } from '../hooks/BackupStore.js';

import { getAllProvinces, getMunicipalitiesPerProvince, 
         getMainPlacesPerMunicipality, getSubPlacesPerMainPlace,
         VarNames, transactionTypes, propertyTypes } from '../utilityFunctions/firestoreComms.js';

import { uploadFiles, allowedListingImageSize, deleteFileOrFolder, deleteFiles } from '../utilityFunctions/cloudStorageComms.js'; // Facilitate cloud storage file uploads/downloads
import Loader from './Loader.js';
import { useSharedVarsContext } from '../hooks/SharedVarsProvider.js';
import Registered from './Registered.js';

const init = Object.freeze({
    listingInfo: {
        dateCreated: '',
        title: '',
        transactionType: '',
        propertyType: '',
        description: '', 
        flagged: false
    },
    specifications : {
        numBedrooms: '',
        numBathrooms: '',
        parkingCapacity: '',
        garageCapacity: '',
        totalFloorArea: '',
        erfSize: ''
    },
    address: {
        complexName: '',
        unitNo: '',
        streetNo: '',
        streetName: ''
    },
    gisCodes: {
        provincialCode: '',
        municipalityCode: '',
        mainPlaceCode: '',
        subPlaceCode: ''
    },
    mapCoordinates: {
        latitude: '',
        longitude: '',
    },
    priceInfo: {
        regularPrice: '',
        offer: {
            discountedPrice: '',
            appliesFor: '',
            expiryDate: ''
        }
    },
    rates: {
        utilityRates: {
          amount: '',
          frequency: ''
        },
        propertyTax: {
          amount: '',
          frequency: ''
        },
        associationFees: {
          amount: '',
          frequency: ''
        }
    },
    currentImages: []
}); // const init = {

const allowedFileTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function AddOrEditListing() {
    const location = useLocation();
    const navigate = useNavigate();
    const params = useParams();

    /** For backing up form data while it is being edited. Since editing of fields may not be many, there is 
     * no need for separate backups for each of state slice (listingInfo, specifications etc. */
    const backupStore = useBackupStore();
    
    // Stores listingInfo field data: dateCreated, title, propertyType, transactionType, description.
    const [listingInfo, setListingInfo] = useState({ ...init.listingInfo}); 
    const [listingInfoErrors, setListingInfoErrors] = useState(null); // Keeps track of errors in the listingInfo fields.

    // Stores specification data: numBedrooms, numBathrooms, floorArea, packingCapacity, garageCapacity.
    const [specifications, setSpecifications] = useState({...init.specifications});
    const [specificationErrors, setSpecificationErrors] = useState(null); // Errors in the specifications data.

    /* Stores address data: complexName, unitNo, streetNo, streetName */
    const [address, setAddress] = useState({...init.address});
    const [addressErrors, setAdddressErrors] = useState(null); // Errors in the address data.

    /* Stores GiS data: provincialCode, municipalityCode, mainPlaceCode, subPlaceCode */
    const [gisCodes, setGisCodes] = useState({...init.gisCodes});
    const [gisCodeErrors, setGisCodeErrors] = useState(null); // Errors in the GIS data.

    const [mapCoordinates, setMapCoordinates] = useState({...init.mapCoordinates}); // Stores latitude and longitude of the listing.
    const [mapCoordinateErrors, setMapCoordinateErrors] = useState(null); // Errors in mapCoordinates dataedits.

    // Stores priceInfo data
    const [priceInfo, setPriceInfo] = useState(deepClone(init.priceInfo)); // init.priceInfo has deeply nested fields.
    const [priceInfoErrors, setPriceInfoErrors] = useState(null);

    const [rates, setRates] = useState(deepClone(init.rates)); // init.rates has deeply nested fields.
    const [rateErrors, setRateErrors] = useState(null);
    const [currentImages, setCurrentImages] = useState([]);
    
    const [updateMode, setUpdateMode] = useState(false); // updateMode = true, means an existing listing has been retrieved from the database,
                                                        // retrieved for possible update.
                                                        // updateMode = false, means that data is to be captured for a new listing. A new listing is being captured.
    const [imagesToUpload, setImagesToUpload] = useState([]);
    const [loadingMessage, setLoadingMessage] = useState(null); // A message to be set while form data is being fetched.
                                                                // After form data has been loaded, set this state to null.
    const [attachmentErrors, setAttachmentErrors] = useState(null); // Errors to do with attachment or no attachment of images. Data capturing stage.
    const [uploadingErrors, setUploadingErrors] = useState(null); // Errors experienced while uploading images to Firebase storage. Firebase data submission stage.
    const [slideIndex, setSlideIndex] = useState(0);
    const listingUniqueId = useRef(null);
    const [attachImages, setAttachImages] = useState(false); // Whether (true/false) to attach images during listing update.

    /* Variables to be set to false while the provinces, municipalities, main places and sub-places data, respectively is being loaded.
       Set back to true after fetching data. */
    const [provincesLoaded, setProvincesLoaded] = useState(true); 
    const [municipalitiesLoaded, setMunicipalitiesLoaded] = useState(true);
    const [mainPlacesLoaded, setMainPlacesLoaded] = useState(true);
    const [subPlacesLoaded, setSubPlacesLoaded] = useState(true);

    // Data for display in the provinces, municipalities, main places and subPlaces dropdowns.
    const [provinces, setProvinces] = useState([]);
    const [municipalities, setMunicipalities] = useState([]);
    const [mainPlaces, setMainPlaces] = useState([]);
    const [subPlaces, setSubPlaces] = useState([]);
    const sortFields = ['name asc'];

    /* For setting the default and initial selected values in the dropdown only, during the retrieval
        of listing data */
    const [selectedProvince, setSelectedProvince] = useState(null);
    const [selectedMunicipality, setSelectedMunicipality] = useState(null);
    const [selectedMainPlace, setSelectedMainPlace] = useState(null);
    const [selectedSubPlace, setSelectedSubPlace] = useState(null);

    const {addVar, getVar, varExists, updateVar} = useSharedVarsContext();

    const listingSortFields = ['dateCreated desc', 'listingId desc'];

    function goNext(next) { // Go to the next slide by 1 step.
        let index;
        if (next < 0)
            index = -1;
        else if (next > 0)
            index = 1;
        
        index += slideIndex;
        if (index < 0)
            index = currentImages.length - 1;
        else if (index > currentImages.length - 1)
            index = 0;

        setSlideIndex(index);
    } // function goNext(next) {
    
    /**Indicate whether there are any fields that were edited on the form.
     * 
     * If the backup store has values, this indicates that fields were edited.
     */
    function fieldsEdited() {
        return backupStore.hasValues();
    }

    function handleMarkedForDeletionClicked(e) {
        const images = currentImages.map(image => ({ ...image }));

        if (e.target.checked)
            images[slideIndex].toDelete = true;
        else { // remove the toDelete field.
            const { toDelete, ...imagesUpdate } = images[slideIndex];
            images[slideIndex] = imagesUpdate;
        }

        setCurrentImages(images);
    } // function handleMarkedForDeletionClicked(e)

    function disableButton() {
        if (updateMode === false)// If this is a new Listing data entry. Enable the Save button.
            return false;

        // else: Listng update.

        if (fieldsEdited()
            || (attachImages && imagesToUpload.length > 0)) // If there were any fields that were edited, an intent to upload images and any images that were attached, enable the Save button.
            return false;
        
        // If the were any listing images marked for deletion, enable the Save button.
        if (currentImages.find(image=> {
            return image.toDelete === true;
        }) !== undefined) {
            return false;
        }
        return true;
    } // function disableButton()

    function backupSelectedPlace(placeType) {
        let path = `selectedPlaces.${placeType}`;
        let selBackup;
        switch (placeType) {
            case 'province':
                selBackup = { ...selectedProvince };
                break;
            case 'municipality':
                selBackup = { ...selectedMunicipality };
                break;
            case 'mainPlace':
                selBackup = { ...selectedMainPlace };
                break;
            case 'subPlace':
                selBackup = { ...selectedSubPlace };
                break;
            default:
                break;
        }
        if (!selBackup)
            return;
        backupStore.store(path, selBackup);
    }

    /**Called for backing up places arrays */
    function backupPlaces(placesType) {
        let path;
        let places;
        switch (placesType) {
            case 'municipalities':
                places = [ ...municipalities ];
                break;
            case 'mainPlaces':
                places = [ ...mainPlaces  ];
                break;
            case 'subPlaces':
                places = [ ...subPlaces  ];
                break;
            default:
                break;
        }        
        if (!places)
            return;

        path = `places.${placesType}`;
        backupStore.store(path, places);
    }

    function backup(path) {
        path = path.replace(/-/g, '.');  // 'listingInfo.address'
        const fields = path.split('.'); // [ 'listingInfo', 'address' ]
        const stateName = fields[0]; // 'listingInfo'
        const subPath = path.substring(stateName.length + 1); // 'address'
        
        let anObject;
        switch (stateName) {
            case 'listingInfo':
                anObject = listingInfo;
                break;
            case 'specifications':
                anObject = specifications;
                break;
            case 'priceInfo':
                anObject = deepClone(priceInfo);
                break;
            case 'rates':
                anObject = rates;
                break;
            case 'address':
                anObject = address;
                break;
            case 'gisCodes':
                anObject = gisCodes;
                let placesType, placeType;
                switch (subPath) {
                    case 'provincialCode': // If the provincial code is backed up.
                        placesType = 'municipalities'; // Back up the municipalities (dropdown) linked the provincial code.
                        placeType = 'province'; // Back up the currently selected province.
                        break;
                    case 'municipalityCode':  // If the municipality code is backed up.
                        placesType = 'mainPlaces'; // Back up the main places (dropdown) linked to the municpality.
                        placeType = 'municipality'; // Back up the currently selected municipality.
                        break;
                    case 'mainPlaceCode':
                        placesType = 'subPlaces';
                        placeType = 'mainPlace';
                        break;
                    case 'subPlaceCode':
                        placeType = 'subPlace';
                        break;                    
                    default:
                        break;
                }
                if (placesType)
                    backupPlaces(placesType);
                if (placeType)
                    backupSelectedPlace(placeType);
                break;
            case 'mapCoordinates':
                anObject = mapCoordinates;
                break;
            default:
                break;
        }
        backupStore.store(path, get(anObject, subPath));
    }

    function revertSelectedPlace(placeType) {
        let path = `selectedPlaces.${placeType}`;
        const place = backupStore.getAndClear(path);
        if (!place)
            return;
        switch (placeType) {
            case 'province':                
                setSelectedProvince({ ...place });
                break;
            case 'municipality':
                setSelectedMunicipality({ ...place });
                break;
            case 'mainPlace':
                setSelectedMainPlace({ ...place });
                break;
            case 'subPlace':
                setSelectedSubPlace({ ...place });
                break;
            default:
                break;
        }
    }

    function revertPlaces(placesType) {
        let path = `places.${placesType}`;        
        const places = backupStore.getAndClear(path);
        if (!places)
            return;

        switch (placesType) {
            case 'municipalities':
                setMunicipalities(places);
                break;
            case 'mainPlaces':
                setMainPlaces(places);
                break;
            case 'subPlaces':
                setSubPlaces(places);
                break;
        }
    }

    function revert(path) {
        path = path.replace(/-/g, '.');
        const fields = path.split('.');
        const stateName = fields[0];
        const subPath = path.substring(stateName.length + 1);

        let anObject;
        switch (stateName) {
            case 'listingInfo':
                anObject = backupStore.getUpdatedIfDiff(listingInfo, path);
                if (anObject) {
                    setListingInfo(anObject);
                    validateListingInfo(anObject);
                }
                break;
            case 'specifications':
                anObject = backupStore.getUpdatedIfDiff(specifications, path);
                if (anObject) {
                    setSpecifications(anObject);
                    validateSpecifications(anObject);
                }
                break;
            case 'priceInfo':
                anObject = backupStore.getUpdatedIfDiff(priceInfo, path);
                if (anObject) {
                    setPriceInfo(anObject);
                    validatePriceInfo(anObject);
                }
                break;
            case 'rates':
                anObject = backupStore.getUpdatedIfDiff(rates, path);
                if (anObject) {
                    setRates(anObject);
                    validateRates(anObject);
                }
                break;
            case 'address':
                anObject = backupStore.getUpdatedIfDiff(address, path);
                if (anObject) {
                    setAddress(anObject);
                    validateAddress(anObject);
                }
                break;
            case 'gisCodes':
                anObject = backupStore.getUpdatedIfDiff(gisCodes, path);
                if (anObject) {
                    setGisCodes(anObject);
                    validateGisCodes(anObject);
                }
                // Also revert the dropdown data of the places and selected places.
                let placesType, placeType;
                switch (subPath) {
                    case 'provincialCode':
                        placesType = 'municipalities';
                        placeType = 'province';
                        break;
                    case 'municipalityCode':
                        placesType = 'mainPlaces';
                        placeType = 'municipality';
                        break;
                    case 'mainPlaceCode':
                        placesType = 'subPlaces';
                        placeType = 'mainPlace';
                        break;
                    case 'subPlaceCode':
                        placeType = 'subPlace';
                        break;
                    default:
                        break;
                }
                if (placesType)
                    revertPlaces(placesType);
                if (placeType)
                    revertSelectedPlace(placeType);
                break;
            case 'mapCoordinates':
                anObject = backupStore.getUpdatedIfDiff(mapCoordinates, path);
                if (anObject)
                    setMapCoordinates(anObject);
                break;
            default:
                break;
        }        
    }

    function getEditComponent(path) {
        path = path.replace(/-/g, '.');
        return (
            <EditField backupCallback={()=> backup(path)} revertCallback={()=> revert(path)} />
        );
    }

    function isEditable(fieldPath) {
    // Basically check if a fieldpath exists in the backupStore object.
        fieldPath = fieldPath.replace(/-/g, '.'); // Replace hyphens (-) with dots (.)
        
        if (!updateMode) // Meaning this is a new listing data capture. Return true.
            return true;
            
        return backupStore.get(fieldPath) !== undefined;
    } // function isEditable(fieldPath)

    /**Check whether the backupStore has a value at the fieldpath.
     * A field is not editable if it has no value at the backupStore */
    function isNotEditable(fieldPath) {
        return !isEditable(fieldPath);
    } // function isNotEditable(fieldPath)

    function getAttachmentIcon() {
        // Return the right html to display the Attach or Cancel Attachments icon with its functionality.
        if (updateMode && currentImages.length < 6) {
          const icon = attachImages? <><MdCancel/>Cancel Attachments</>
                                     : <><IoMdAttach/>Attach Images</>;
          return (
            <Link className='w3-btn w3-small w3-text-black w3-margin-top' onClick={e=> {toggleAttachImages()}}>
              {icon}
            </Link>
          );
        } // if (updateMode)
    
        return null;
    } // function getAttachmentIcon() {

    function toggleAttachImages() {
        setAttachImages(!attachImages);

        if (!attachImages)
            setImagesToUpload([]);
        
    } // function toggleAttachImages() {
    
    /**Function called upon the selection of a province in the provinces dropdown, so as to update the
     * municipalities displayed in the municipalities dropdown to those of the selected province.
     */
    async function provinceSelected(selProvince) {
        try {
            if (gisCodes.provincialCode === selProvince.code) // Do not proceed if there was no real change in the selection of the provincial code.
                return;
            
            // Update the form provincial code to the currently selected one.
            const newGisCodes = { ...gisCodes, provincialCode: selProvince.code };
            setGisCodes(newGisCodes);
            validateGisCodes(newGisCodes);

            setSelectedProvince(selProvince); // Synchronise with currently selected province state in the dropdown.
            // Load municipalities belonging to the selected provincial code. This is for the municipalities Dropdown.
            setMunicipalitiesLoaded(false);
            setMunicipalities(await getMunicipalitiesPerProvince(newGisCodes.provincialCode));
        } catch (error) {
            toast.error(error, toastifyTheme);            
        } finally {
            setMunicipalitiesLoaded(true);

        } // finally
    } // function provinceSelected() {

    /** Function called upon the selection of the municipality in the municipalities dropdown. 
     * To update the main places displayed the main places dropdown to those of the selected municipality.
    */
    async function municipalitySelected(selMunicipality) {
        
        try {
            if (gisCodes.municipalityCode === selMunicipality.code) // Do not proceed if there was no real change in the selection of the municipality code.
                return;
            
            // Update the currently selected address municipality code.
            const newGisCodes = { ...gisCodes, municipalityCode: selMunicipality.code };
            setGisCodes(newGisCodes);          
            validateGisCodes(newGisCodes);

            setSelectedMunicipality(selMunicipality); // Synchronise with currently selected municipality state in the dropdown.
    
            // Load all the main places of the municipality
            setMainPlacesLoaded(false);
            setMainPlaces(await getMainPlacesPerMunicipality(newGisCodes.provincialCode, newGisCodes.municipalityCode));

        } catch (error) {
            toast.error(error, toastifyTheme);
        } finally {
            setMainPlacesLoaded(true);
        }
    } // async function municipalitySelected() {
    
    /**Function called upon the selection of a main place in the main places dropdown.
     * To update the sub-places displayed in the sub-places dropdown to those of the selected main place.
    */
    async function mainPlaceSelected(selMainPlace) {
        try {
            if (gisCodes.mainPlaceCode === selMainPlace.code) // Do not proceed if there was no real change in the selection of the main place code.
                return;
    
            const newGisCodes = { ...gisCodes, mainPlaceCode: selMainPlace.code }; // update the main place code to the currently selected main place code.
    
            setGisCodes(newGisCodes);
            validateGisCodes(newGisCodes);
            
            setSelectedMainPlace(selMainPlace); // Synchronise with currently selected main place state in the dropdown.

            // Load all the sub-places of the main place of the municipality
            setSubPlacesLoaded(false);
            setSubPlaces(await getSubPlacesPerMainPlace(newGisCodes.provincialCode, newGisCodes.municipalityCode, 
                                                        newGisCodes.mainPlaceCode));
        } catch (error) {
            toast.error(error, toastifyTheme);
        } finally {
            setSubPlacesLoaded(true);
        }
    } // async function mainPlaceSelected(code) {

    async function subPlaceSelected(selSubPlace) {
        // Function to be called upon the selection of a sub-place in the sub-places dropdown.
        const newGisCodes = { ...gisCodes, subPlaceCode: selSubPlace.code };
        setGisCodes(newGisCodes);
        validateGisCodes(newGisCodes);

        setSelectedSubPlace(selSubPlace); // Synchronise with currently selected sub-place state in the dropdown.
    } // async function subPlaceSelected(code) {

    function sameFiles(object1, object2) {
        return objCompare(object1, object2, 'name', 'size', 'type', 'webkitdirectory') === 0;
    }

    function handleChange(e) {
    // Update the relevant state object as the user types in the data.
        const fieldPath = e.target.name.replace(/-/g, '.');
        const stateName = fieldPath.split('.')[0];
        const subPath = fieldPath.substring(stateName.length + 1);
        let obj;
        switch (stateName) {
            case 'listingInfo':
                obj = { ...listingInfo }; // No need for deep cloning, object fields deeply nested.
                set(obj, subPath, e.target.value);
                setListingInfo(obj);
                validateListingInfo(obj);
                break;
            case 'address':
                obj = { ...address };
                set(obj, subPath, e.target.value);
                setAddress(obj);
                validateAddress(obj);
                break;
            case 'specifications':
                obj = { ...specifications };
                set(obj, subPath, e.target.value);
                setSpecifications(obj);
                validateSpecifications(obj);
                break;
            case 'mapCoordinates':
                obj = { ...mapCoordinates };
                set(obj, subPath, e.target.value);
                setMapCoordinates(obj);
                validateMapCoordinates(obj);
                break;
            case 'priceInfo':
                obj = deepClone(priceInfo);
                set(obj, subPath, e.target.value);
                setPriceInfo(obj);
                validatePriceInfo(obj);
                break;
            case 'rates':
                obj = deepClone(rates);
                set(obj, subPath, e.target.value)
                setRates(obj);
                validateRates(obj);
                break;
            case 'imagesToUpload':                
                const imageFiles = [...imagesToUpload];
                for (let idx = 0; idx < e.target.files.length; idx++) {
                    const file = e.target.files[idx];
                    
                    // Reject duplicate image uploads. Images are duplicate if they share file name + extension.
                    if (
                        (imageFiles.find(imgFile=> {
                            return sameFiles(objectFromFile(file), objectFromFile(imgFile));
                        }) === undefined)
                        && (currentImages.find(image=> {
                            return (file.name === image.fileName);
                        }) === undefined)) {
                        imageFiles.push(file);
                    }
                } // for (let idx = 0; idx < e.target.files.length; idx++)    
                setImagesToUpload(imageFiles);
                validateImages(imageFiles);
                break;
            default:
                break;
        }
    } // function handleChange(e) {

    async function transactionTypeSelected(selTransType) {
        if (selTransType === listingInfo.transactionType)
            return;  // No changes.

        const data = { ...listingInfo, transactionType: selTransType };
        setListingInfo(data);
        validateListingInfo(data);
    } // async function transactionTypeSelected()

    async function propertyTypeSelected(selPropType) {
        if (selPropType === listingInfo.propertyType)
            return; // No changes.

        const data = { ...listingInfo, propertyType: selPropType };
        setListingInfo(data);
        validateListingInfo(data);
    } // function propertyTypeSelected(propertyType)

    function validateListingInfo(pListingInfo) {
        let errorList = {};
        if (!isValidShortDescription(pListingInfo.title))
            errorList.title = 'Invalid title';

        if (!transactionTypes.includes(pListingInfo.transactionType))
            errorList.transactionType = 'Invalid transaction type';

       if (!propertyTypes.includes(pListingInfo.propertyType))
            errorList.propertyType = 'Invalid property type';

        if ((errorList.propertyType === undefined)
            && (errorList.transactionType === undefined)) {
            if (pListingInfo.propertyType === 'Room' && pListingInfo.transactionType === 'Sale')
                errorList.transactionType = 'A room only be rented.'
        }    
        if (!isValidDescription(pListingInfo.description))
            errorList.description = 'Invalid description';

        setListingInfoErrors(errorList);
        return (!hasValues(errorList));
    } // function validateListingInfo(pListingInfo)
    
    function validateSpecifications(pSpecifications) {
        let errorList = {};
        if (!isValidNumBedrooms(pSpecifications.numBedrooms))
            errorList.numBedrooms = 'Invalid number of bedrooms';
        
        if (!isValidNumBedrooms(pSpecifications.numBathrooms))
            errorList.numBathrooms = 'Invalid number of bathrooms';

        if (!isValidNumBedrooms(pSpecifications.parkingCapacity))
            errorList.parkingCapacity = 'Invalid parking capacity';

        if (pSpecifications.garageCapacity !== '' && !isValidNumBedrooms(pSpecifications.garageCapacity))
            errorList.garageCapacity = 'Invalid garage capacity';

        if (!isValidNaturalNumber(pSpecifications.totalFloorArea))
            errorList.totalFloorArea = 'Invalid total floor area';

        if (pSpecifications.erfSize !== '' && !isValidNaturalNumber(pSpecifications.erfSize))
            errorList.erfSize = 'Invalid Erf size';


        setSpecificationErrors(errorList);
        return (!hasValues(errorList));
    } // function validateSpecifications(pSpecifications)

    function validateAddress(pAddress) {
        let errorList = {};
        if (pAddress.complexName !== '' && !isValidName(pAddress.complexName))
            errorList.complexName = 'Invalid complex name';

        if (pAddress.unitNo !== '' && !isValidStreetNo(pAddress.unitNo))
            errorList.unitNo = 'Invalid unit number';
        
        if (!isValidStreetNo(pAddress.streetNo))
            errorList.streetNo = 'Invalid street number';

        if (pAddress.streetName !== '' && !isValidShortDescription(pAddress.streetName))
            errorList.streetNamme = 'Invalid street name';

        setAdddressErrors(errorList);
        return (!hasValues(errorList));
    }

    function validateGisCodes(pGisCodes) {
        const errorList = {};
        if (provinces.findIndex(province=> {
            return province.code === pGisCodes.provincialCode;
        }) < 0) {
            errorList.provincialCode = 'Please choose a valid province!';
        }
        if (municipalities.findIndex(municipality=> {
            return municipality.code === pGisCodes.municipalityCode;
        }) < 0) {
            errorList.municipalityCode = 'Please choose a valid municipality!';
        }
        if (mainPlaces.findIndex(mainPlace=> {
            return mainPlace.code === pGisCodes.mainPlaceCode;
        }) < 0) {
            errorList.mainPlaceCode = 'Please choose a valid main place!';
        }
        
        if (subPlaces.findIndex(subPlace=> {
            return subPlace.code === pGisCodes.subPlaceCode;
        }) < 0) {
            errorList.subPlaceCode = 'Please choose a valid sub-place!';
        }
        setGisCodeErrors(errorList);
        return (!hasValues(errorList));
    }

    function validatePriceInfo(pPriceInfo) {   
        let errorList = {};
        if (!isValidPositiveDecimalNumber(priceInfo.regularPrice))
            errorList.regularPrice = 'Invalid price';

        // If the user provides an offer, then all the offer fields must be populated.
        if (pPriceInfo.offer.discountedPrice !== '' 
            || pPriceInfo.offer.appliesFor !== '' || pPriceInfo.offer.expiryDate !== '') {
            if (!isValidPositiveDecimalNumber(pPriceInfo.offer.discountedPrice))
                set(errorList, 'offer.discountedPrice', 'Invalid discounted price');
            else if (Number.parseFloat(pPriceInfo.offer.discountedPrice) 
                        >= pPriceInfo.regularPrice)
                set(errorList, 'offer.discountedPrice', 'Discounted price cannot be more than the regular price');

            if (!isValidNaturalNumber(pPriceInfo.offer.appliesFor))
                set(errorList, 'offer.appliesFor', 'Invalid Applies For');
    
            // validating expiry date...
            try {
                const currMilliSec = Date.now(); // Current date and time in milliseconds.
    
                const dateRegEx = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
                if (!dateRegEx.test(pPriceInfo.offer.expiryDate))
                    throw new Error('Invalid offer expiry date');
    
                const expiryDate = new Date(pPriceInfo.offer.expiryDate);
                const expiryDateMilliSec = expiryDate.getTime();
                
                if (expiryDateMilliSec < currMilliSec || isNaN(expiryDate)) 
                    set(errorList, 'offer.expiryDate', 'Offer expiry date must be in the future');
                    
            } catch (error) {
                set(errorList, 'offer.expiryDate', 'Invalid offer expiry date');
            } // catch(error)
        } // if (pPriceInfo.offer.discountedPrice !== ''
        setPriceInfoErrors(errorList);
        return (!hasValues(errorList));
    }

    function validateRates(pRates) {
        let errorList = {};
        if (pRates.utilityRates.amount !== ''
            || pRates.utilityRates.frequency !== '') {
            
            if (!isValidPositiveDecimalNumber(pRates.utilityRates.amount))
                set(errorList, 'utilityRates.amount', 'Invalid utility rate amount');

            if (!isValidNaturalNumber(pRates.utilityRates.frequency))
                set(errorList, 'utilityRates.frequency', 'Invalid utility billing frequency');
            else if (!(Number.parseInt(pRates.utilityRates.frequency) <= 12))
                set(errorList, 'utilityRates.frequency', 'Must be 1 to 12 months');
        } // if (pRates.utilityRates.amount !== '' || pRates.utilityRates.frequency !== '') {

        if (pRates.propertyTax.amount !== '' || pRates.propertyTax.frequency !== '') {
            if (!isValidPositiveDecimalNumber(pRates.propertyTax.amount))
                set(errorList, 'propertyTax.amount', 'Invalid property tax rate amount');

            if (!isValidNaturalNumber(pRates.propertyTax.frequency))
                set(errorList, 'propertyTax.frequency', 'Invalid property tax billing frequency');
            else if (!(Number.parseInt(pRates.propertyTax.frequency) <= 12))
                set(errorList, 'propertyTax.frequency', 'Must be 1 to 12 months');
        } // if (pRates.propertyTax.amount !== '' || pRates.propertyTax.frequency !== '') {

        if (pRates.associationFees.amount !== '' || pRates.associationFees.frequency !== '') {
            if (!isValidPositiveDecimalNumber(pRates.associationFees.amount))
                set(errorList, 'associationFees.amount', 'Invalid property tax rate amount');

            if (!isValidNaturalNumber(pRates.associationFees.frequency))
                set(errorList, 'associationFees.frequency', 'Invalid association fees billing frequency');
            else if (!(Number.parseInt(pRates.associationFees.frequency) <= 12))
                set(errorList, 'associationFees.frequency', 'Must be 1 to 12 months');
        } // if (pRates.associationFees.amount !== '' || pRates.associationFees.frequency !== '') {

        setRateErrors(errorList);
        return (!hasValues(errorList));
    } // function validateRates(pRates) {

    function validateMapCoordinates(pMapCoordinates) {
        const errorList = {};
        if (mapCoordinates.latitude !== '' || mapCoordinates.longitude !== '') {
            if (!isValidDecimalNumber(mapCoordinates.latitude))
                errorList.latitude = 'Invalid latitude';
    
            if (!isValidDecimalNumber(mapCoordinates.longitude))
                errorList.longitude = 'Invalid longitude';
        } // if (mapCoordinates.latitude !== '' || mapCoordinates.longitude !== '') {

        setMapCoordinateErrors(errorList);
        return (!hasValues(errorList));
    }

    function validateImages(attachedImages) {
        const errorList = {};
        console.log("validateImages() called");
        // Attached images, together with existing images must not exceed the set limit.
        const numImagesForDeletion = currentImages.filter(image=> {
            return image.toDelete === true;
        }).length;
        const retainedImages = currentImages.length - numImagesForDeletion;
        const imageTotal = attachedImages.length + retainedImages - numImagesForDeletion;
        if (imageTotal > 6) {
            set(errorList,
                    'imagesToUpload',
                    `Allowed number of images + attachments exceeded! Please remove ${Math.abs(imageTotal - 6)} image/s`);
        } // if (spaceLeft < 0) {
        else if (imageTotal < 2) {
            set(errorList,
                'imagesToUpload',
                `Please attach at least 2 images!`);
        } // else if (spaceLeft >= 4) {
        for (const idx in attachedImages) {
            const file = attachedImages[idx];
            if (!allowedListingImageSize(file)) {
                set(errorList,
                    'fileSizeError', 'Some of your images exceed the allowed file size!');
            } // if (!allowedListingImageSize(imgFile)) {
            if (!allowedFileTypes.includes(file.type)) {
                set(errorList,
                    'fileTypeError', 'One or more of your uploaded files is not the allowed type!');
            } // if (!allowedFileTypes.includes(file.type)) {
        } // for (const idx in attachedImages) {

        const errorsFound = hasValues(errorList);
        console.log(errorList);
        if (errorsFound) {            
            const errors = [];
            Object.keys(errorList).forEach(key => errors.push(errorList[key]));
            setAttachmentErrors(errors);
        }
        else {
            setAttachmentErrors(null);
        }
        return (!errorsFound);
    }

    /**Validate currently populated data. Return true if valid, otherwise false */
    function validateFormData() {
        let result = true;
        const validations = { // Perform validation on the entire input data.
            listingInfo: validateListingInfo(listingInfo),
            specifications: validateSpecifications(specifications),
            priceInfo: validatePriceInfo(priceInfo),
            rates: validateRates(rates),
            address: validateAddress(address),
            gisCodes: validateGisCodes(gisCodes),
            mapCoordinates: validateMapCoordinates(mapCoordinates),
            imagesToUpload: validateImages(imagesToUpload)            
        }
        
        for (const key in validations) {
            if (!validations[key])
                result = false;
        }
        return result;
    } // function validateFormData() 

    function removeImageToUpload(imageToRemove) {
        const updatedImageList = imagesToUpload.filter(image=> {
                                        return !sameFiles(objectFromFile(imageToRemove), objectFromFile(image));
                                    });
        setImagesToUpload(updatedImageList);
        validateImages(updatedImageList);
    } // function removeImageToUpload(fileName) {
    
    async function submitData(e) {
        e.preventDefault();
        if (!(validateFormData())) {
            toast.error('Could not submit your data. Please check your input and try again!', toastifyTheme);
            return;
        } // if (!(await validate(formData))) {
        
        setLoadingMessage(updateMode? 'Updating your listing ...' : 'Creating a new listing ...');
        const data = deepClone({
            ...listingInfo,
            ...specifications,
            priceInfo,
            rates,
            address: {
                ...address,
                ...gisCodes
            },
            mapCoordinates
        }); // Create an object that is a true clone, an object that is completely unrelated to its source.

        // This ensures that any removal of fields in data object do not affect formData.
        if (data.dateCreated !== '') {
            const dateCreated = new Date(data.dateCreated); // data.dateCreated is of the form yyyy-MM-ddTmm:hh:ss
            data.dateCreated = Timestamp.fromDate(dateCreated);
        } // if (data.dateCreated !== '') {
        else
            data.dateCreated = Timestamp.fromDate(new Date());
        
        data.priceInfo.regularPrice = Number.parseFloat(data.priceInfo.regularPrice); // Convert to decimal number
        let value;
        // ATTENTION: By Listing update, it means the data that is to be submitted to Firestore for an update.
        // Process price offer optional fields accordingly...
        if (data.priceInfo.offer.discountedPrice === '') { // Listing update has no offer.
            value = backupStore.get('priceInfo.offer');
            if (value !== undefined
                && value !== '') // Previous listing data has an offer.
                data.priceInfo.offer = deleteField(); // To instruct Firestore to delete the listing offer during update.
            else
                unset(data, 'priceInfo.offer'); // Clear offer data from the listing update. It is just blanks ''.
        } // if (get(editableFields, 'priceInfo.offer.discountedPrice') !== '') {
        else { // Listing update has an offer. Convert offer data accordingly.
            data.priceInfo.offer.discountedPrice = Number.parseFloat(data.priceInfo.offer.discountedPrice);
            data.priceInfo.offer.appliesFor = Number.parseInt(data.priceInfo.offer.appliesFor);
            data.priceInfo.offer.expiryDate = Timestamp.fromDate(new Date(data.priceInfo.offer.expiryDate));
        } // else

        data.numBathrooms = Number.parseInt(data.numBathrooms);
        data.numBedrooms = Number.parseInt(data.numBedrooms);
        data.parkingCapacity = Number.parseInt(data.parkingCapacity);
        
        // Handle the optional field accordingly
        if (data.garageCapacity === '') {    // listing update has no garage capacity.
            value = backupStore.get('specifications.garageCapacity');
            if (value !== undefined
                && value !== '') // Previous listing data had garage capacity
                data.garageCapacity = deleteField(); // To instruct Firestore to remove this field during update.
            else
                unset(data, 'garageCapacity'); // Clear this field from the listing update. Has been blank before update, and still is.
        } // if (data.garageCapacity === '') {
        else // Garage capacity data has been provided. Convert to integer type
            data.garageCapacity = Number.parseInt(data.garageCapacity);

        data.totalFloorArea = Number.parseInt(data.totalFloorArea);        
        // Handle the optional field accordingly
        if (data.erfSize === '') {    // listing update has no Erf size.
            value = backupStore.get('specifications.erfSize');
            if (value !== undefined
                && value !== '') // Previous listing data had the Erf size.
                data.erfSize = deleteField(); // To instruct Firestore to remove this field during update.
            else
                unset(data, 'erfSize'); // Clear this field the listing update. I was blank before update and remains so.
        } // if (data.erfSize === '') {
        else // Erf size has been provided. Convert to integer type.
            data.erfSize = Number.parseInt(data.erfSize);

        // Process the municipal utility rates (optional) accordingly...
        if (data.rates.utilityRates.amount === '') { // Listing update has no municipal utility rates
            value = backupStore.get('rates.utilityRates');
            if (value !== undefined
                && value !== '') // Previous listing data has utility rates.
                data.rates.utilityRates = deleteField(); // To instruct Firestore to delete the listing utility rates during update.
            else
                unset(data, 'rates.utilityRates'); // Clear utility rates data from the listing update. It is just blanks ''.
        } // f (data.rates.utilityRates.amount === '')
        else { // Convert utility rates data accordingly
            data.rates.utilityRates.amount = Number.parseFloat(data.rates.utilityRates.amount);
            data.rates.utilityRates.frequency = Number.parseInt(data.rates.utilityRates.frequency);
        } // else

        // Process the property tax rates (optional) accordingly...
        if (data.rates.propertyTax.amount === '') { // Listing update has no property tax rates
            value = backupStore.get('rates.propertyTax');
            if (value !== undefined
                && value !== '') // Previous listing data has property tax rates.
                data.rates.propertyTax = deleteField(); // To instruct Firestore to delete the listing property tax rates during update.
            else
                unset(data, 'rates.propertyTax'); // Clear property tax rates data from the listing update. It is just blanks ''.
        } // if (get(editableFields, 'rates.propertyTax') !== '') {
        else { // Convert property tax rates data accordingly
            data.rates.propertyTax.amount = Number.parseFloat(data.rates.propertyTax.amount);
            data.rates.propertyTax.frequency = Number.parseInt(data.rates.propertyTax.frequency);
        } // elsenpm 

        // Process the association fees (optional) accordingly...
        if (data.rates.associationFees.amount === '') { // Listing update has no association fees
            value = backupStore.get('rates.associationFees');
            if (value !== undefined
                && value !== '') // Previous listing data has association fees.
                data.rates.associationFees = deleteField(); // To instruct Firestore to delete the listing association fees during update.
            else
                unset(data, 'rates.associationFees'); // Clear association fees data from the listing update. It is just blanks ''.
        } // if (get(editableFields, 'rates.associationFees') !== '') {
        else { // Convert association fees data accordingly
            data.rates.associationFees.amount = Number.parseFloat(data.rates.associationFees.amount);
            data.rates.associationFees.frequency = Number.parseInt(data.rates.associationFees.frequency);
        } // else
        
        if (!hasValues(data.rates)) // If the rates fieldPath is empty, clear it.
            unset(data, 'rates');

        getPaths(init.address).forEach(fieldPath=> { // All address fields.
            fieldPath = `address.${fieldPath}`;
            if (get(data, fieldPath) === '') {
                
                const value = backupStore.get(fieldPath);
                if (value !== undefined
                    && value !== '')  // There was a complexName prior to listing update
                    set(data, fieldPath, deleteField()); // Instruct Firestore to delete the field during update.
                else
                    unset(data, fieldPath); // Remove the field from the listing update.
            } // if (data.address.complexName === '') {
        });

        // Convert latitude and longitude to decimal numbers
        if (data.mapCoordinates.latitude === '') { // No map coordinates provided. Testing with only 1 of the map coordinates suffices.
            value = backupStore.get('mapCoordinates.latitude');
            if (value !== undefined // This listing previously had map coordinates.
                && value !== '')
                data.mapCoordinates = deleteField(); // Instruct Firestore to delete mapCoordinates field.
            else
                unset(data, 'mapCoordinates'); // Remove field from listing update.
        } // if (data.mapCoordinates.latitude === '') {
        else {
            data.mapCoordinates.latitude = Number.parseFloat(data.mapCoordinates.latitude);
            data.mapCoordinates.longitude = Number.parseFloat(data.mapCoordinates.longitude);
        }

        data.userId = auth.currentUser.uid;

        // In case of a listing update, the listingUniqueId.current was set with the listing id.
        // Otherwise generate a new listing unique id.
        const uid = (listingUniqueId.current === null? uuidv4() : listingUniqueId.current);

        const toFolder = `/listings/${auth.currentUser.uid}/${uid}`;
        // Get an array of files (name + extension) of that are marked for deletion.
        let tempCurrentImages = [ ...currentImages ];
        const filesToDelete = tempCurrentImages
                                .filter(image=> {
                                    return image.toDelete === true;  // return true if marked for deletion.
                                })
                                .map(image=> {
                                    const { toDelete, ...imgObject } = image;
                                    return { ...imgObject };
                                });

        if (filesToDelete.length > 0) { // If there were any files marked for deletion, delete them.
            const deleteResult = await deleteFiles(filesToDelete);
            if (deleteResult.deletedFiles?.length > 0) {
                tempCurrentImages = tempCurrentImages.filter(image=> { // Remove files found in deleted files.
                                        for (const idx in deleteResult.deletedFiles) {
                                            const delFile  = deleteResult.deletedFiles[idx];
                                            if (image.url === delFile.url)
                                                return false; // File found in deleted files.
                                        } // for (const idx in deleteResult.deletedFiles) {

                                        return true; // File not found in deleted files.
                                    }); // tempCurrentImages.filter(image=> {
            }  // if (deleteResult.deletedFiles.length > 0) {
            else {
                setLoadingMessage(null);
                toast.error('Could not delete the marked images. Please try again later or contact Support.', toastifyTheme);
                return;
            } // else              
        }

        const uploadResult = await uploadFiles(toFolder, imagesToUpload, setLoadingMessage);
        // call above may return an empty object.
        setLoadingMessage(null);
        if (hasValues(uploadResult) && uploadResult.errors.length > 0) { // The uploadResults object has errors
            setUploadingErrors(uploadResult.errors);
            toast.error('Uploading of images failed', toastifyTheme);
            
            // If there was failure uploading any of the files, undo any uploads that succeeded.
            if (uploadResult.succeededFiles.length > 0) {
                    uploadResult.downloadUrls.forEach(downloadUrl=> deleteFileOrFolder(downloadUrl));
                if (!updateMode) // This is a new listing attempt. Delete the entire folder.
                    await deleteFileOrFolder(toFolder);
            }
        } // if (hasValues(uploadResult) && uploadResult.errors.length > 0) {
        else {
            if (hasValues(uploadResult) && uploadResult.downloadUrls.length > 0) {  // Verify if any images were uploaded.
                for (const idx in uploadResult.downloadUrls) {
                    const fileName = uploadResult.succeededFiles[idx].name;
                    const url = uploadResult.downloadUrls[idx];
                    tempCurrentImages.push({fileName, url});
                } // for (const idx in downloadUrls) {
            } // if (hasValues(uploadResult) && uploadResult.downloadUrls.length > 0) {

            data.images = [ ...tempCurrentImages ];
            setCurrentImages(tempCurrentImages);
            const docRef = doc(db, '/listings', uid);
        
            try {
                await setDoc(docRef, data, {merge: true});
                setLoadingMessage(null);
                backupStore.clearAll();
                setUpdateMode(true);
                setImagesToUpload([]);

                if (listingInfo.dateCreated === '') {
                    const tempListingInfo = { ...listingInfo };
                    const dateCreated = timeStampString(data.dateCreated.toDate());
                    tempListingInfo.dateCreated = dateCreated;
                    setListingInfo(tempListingInfo);
                }
                listingUniqueId.current = uid;

                // Update the value of clickedListing.
                updateClickedListing(data);
                const msg = updateMode? 'Congratulations! Your listing has been updated!'
                                        : 'Success! Your listing has been created!';                    
                toast.success(msg, toastifyTheme);
            } catch (error) {
                    setLoadingMessage(null);
                    console.log(error);
                    toast.error('Could not create a new listing. Please try again or contact Support.', toastifyTheme);
            }
            
        } // else
    } // function submitData() {

    async function updateClickedListing(newData) {
        newData.listingId = listingUniqueId.current;
        let province = provinces.find(prov=> prov.code === newData.address.provincialCode),
            municipality = municipalities.find(mun=> mun.code === newData.address.municipalityCode),
            mainPlace = mainPlaces.find(main=> main.code === newData.address.mainPlaceCode),
            subPlace = subPlaces.find(sub=> sub.code === newData.address.subPlaceCode);

        newData.address.provinceName = province.name;
        newData.address.municipalityName = municipality.name;
        newData.address.mainPlaceName = mainPlace.name;
        newData.address.subPlaceName = subPlace.name;

        if (!(newData.address.complexName instanceof(String))) // Field was set to deleteField() value
            delete newData.address['complexName'];

        if (!(newData.address.unitNo instanceof(String))) // Field was set to deleteField() value 
            delete newData.address['unitNo'];

        if (!(newData.address.streetName instanceof(String))) // Field was set to deleteField value
            delete newData.address['streetName'];

        newData.dateCreated = newData.dateCreated.toDate();
        if ('offer' in newData.priceInfo) {
            if ('expiryDate' in newData.priceInfo.offer)
                newData.priceInfo.offer.expiryDate = newData.priceInfo.offer.expiryDate.toDate();
            else // offer field was set to deleteField() value
                delete newData.priceInfo['offer'];
        }

        // Set the current price of the listing.
        newData.currentPrice = newData.priceInfo.regularPrice;
        if ('offer' in newData.priceInfo && newData.priceInfo.offer.expiryDate.getTime() >= Date.now())
            newData.currentPrice = newData.priceInfo.offer.discountedPrice;

        if (!varExists(VarNames.CLICKED_LISTING))
            addVar(VarNames.CLICKED_LISTING, newData);
        else
            updateVar(VarNames.CLICKED_LISTING, newData);

        if (varExists(VarNames.LISTINGS)) { // Update the listings shared var accordingly.
            const theListings = [...getVar(VarNames.LISTINGS)];
            const index = binarySearchObj(theListings, newData, 0, ...listingSortFields);
            if (index < 0) // Empty array.
                theListings.push(newData);
            else {
                const comparison = objCompare(theListings[index], newData, ...listingSortFields);
                if (comparison < 0) { // Place to the right of theListings[index]
                    if (index + 1 < theListings.length)
                        theListings.splice(index + 1, 0, newData);
                    else
                        theListings.push(newData);
                } // if (comparison < 0) {
                else if (comparison > 0)
                    theListings.splice(index, 0, newData);
                else
                    theListings[index] = newData; // Update the listings at position index.
            } // else
            updateVar(VarNames.LISTINGS, theListings);
        } // if (varExists(VarNames.LISTINGS)) {
    } // function updateClickedListing(data) {
    
    useEffect(() => {
        (async ()=> {
            if ((location.pathname === `/my-profile/listings/${params.listingId}/edit`) && (!varExists(VarNames.CLICKED_LISTING)))
                navigate('/my-profile/listings');
                  
            try {
                // Get the provinces from Firestore.
                setProvincesLoaded(false);
                const tempProvinces = await getAllProvinces();
                setProvinces(tempProvinces);
            } catch (error) {
                toast.error(error, toastifyTheme);
                return;
            } finally {
                setProvincesLoaded(true);
            } // finally

            if (location.pathname === `/my-profile/listings/${params.listingId}/edit`)
                retrieveListingData();
        })();
    }, []);
    
    async function retrieveListingData() {
        // Get the listing and populate the form.
        if (varExists(VarNames.CLICKED_LISTING)) {
            let clickedListing = getVar(VarNames.CLICKED_LISTING); // Fetch from the previously clicked listing
            clickedListing = deepClone(clickedListing);

            setLoadingMessage('Loading the listing ...');
            // Perform some transformation to get the listing form-ready.
            // Ensure that non-existent data in clickedListing is filled with blanks.
            
            const { dateCreated, title, description,
                    propertyType, transactionType } = { ...init.listingInfo, ...clickedListing };
            setListingInfo({ dateCreated, title, description, propertyType, transactionType });

            const { numBedrooms, numBathrooms, erfSize, garageCapacity,
                    parkingCapacity, totalFloorArea } = {...init.specifications, ...clickedListing };
            setSpecifications(
                { numBedrooms, numBathrooms, erfSize, garageCapacity, parkingCapacity, totalFloorArea }
            );
            
            // Optional address fields which are not available will be created and assigned empty strings.
            const { complexName, unitNo, streetNo, streetName } = ({...init.address, ...clickedListing.address});
            setAddress({ complexName, unitNo, streetNo, streetName });
            
            const { provincialCode, municipalityCode, mainPlaceCode, subPlaceCode } = ({...init.gisCodes, ...clickedListing.address});
            setGisCodes({ provincialCode, municipalityCode, mainPlaceCode, subPlaceCode });

            let temp = deepClone({ ...init.priceInfo }); // using deepClone because of potential deeply nested fields.
            let paths = getPaths(clickedListing.priceInfo);
            paths.forEach(path=> {
                set(temp, path, get(clickedListing.priceInfo, path));
            });
            let expiryDate = get(temp, 'offer.expiryDate');
            if (expiryDate) {
                expiryDate = timeStampYyyyMmDd(new Date(expiryDate));
                set(temp, 'offer.expiryDate', expiryDate);
            }
            
            setPriceInfo(temp);

            const ratesData = deepClone({ ...init.rates, ...clickedListing.rates });
            setRates(ratesData);
            
            setMapCoordinates({ ...init.mapCoordinates, ...clickedListing.mapCoordinates});

            const images = clickedListing.images.map(image=> ({ ...image })); // image = { fileName, url }
            setCurrentImages(images);

            listingUniqueId.current = clickedListing.listingId;
            let anError;
            try {
                // =================Set data for the respective drop-downs================
                // 1. Default selected provnce
                setProvincesLoaded(false);
                const tempProvinces = await getAllProvinces();
                const selProvince = tempProvinces.find(prov=> prov.code === provincialCode);
                setProvinces(tempProvinces);
                if (selProvince)
                    setSelectedProvince(selProvince);

                // 2.1 Municipalities.
                setMunicipalitiesLoaded(false);
                const tempMunicipalities = await getMunicipalitiesPerProvince(provincialCode);
                setMunicipalities(tempMunicipalities);
                // 2.2. Default selected municipality
                const selMunicipality = tempMunicipalities.find(munic=> (munic.code === municipalityCode));
                if (selMunicipality)
                    setSelectedMunicipality(selMunicipality);
                
                // 3.1. Main places.
                setMainPlacesLoaded(false);
                const tempMainPlaces = await getMainPlacesPerMunicipality(provincialCode, municipalityCode);
                setMainPlaces(tempMainPlaces);
                // 3.2. Default selected main place.
                const selMainPlace = tempMainPlaces.find(place=> place.code === mainPlaceCode)
                if (selMainPlace)
                    setSelectedMainPlace(selMainPlace);
                
                // 4.1. Sub-places.
                setSubPlacesLoaded(false);
                const tempSubPlaces = await getSubPlacesPerMainPlace(provincialCode,
                                            municipalityCode, mainPlaceCode);
                setSubPlaces(tempSubPlaces);
                // 4.2. Default selected sub-place.
                const selSubPlace = tempSubPlaces.find(place=> place.code === subPlaceCode);
                if (selSubPlace)
                    setSelectedSubPlace(selSubPlace);
            } catch (error) {
                console.log(error);
                anError = 'Error while getting place data.';
            } finally {
                setProvincesLoaded(true);
                setMunicipalitiesLoaded(true);
                setMainPlacesLoaded(true);
                setSubPlacesLoaded(true);
            }         
            setLoadingMessage(null);
            if (anError) {
                toast.error(anError);
                return;
            }            
             // Setting up the form to enable edtiting of data
            setUpdateMode(true);
        } // if (varExists(VarNames.CLICKED_LISTING) && varExists(VarNames.LISTINGS)) {
    } // function retrieveListingData() {

    if (loadingMessage !== null)
        return <Loader message={loadingMessage} />

    return (
        <Registered>
            <div className='w3-container'>
                {listingUniqueId.current === null?
                    <>
                        <h1>Add New Listing</h1>
                        <div className='w3-padding'>
                            <NavLink className='w3-btn w3-round w3-theme-d5'  to={`/my-profile/listings`}>Back to my listings</NavLink>
                        </div>
                    </>
                    :
                    <>
                        <h1>Edit Listing</h1>
                        <div className='w3-padding'>
                            <NavLink className="w3-btn w3-round w3-theme-d5" to={`/my-profile/listings/${listingUniqueId.current !== null? listingUniqueId.current : ''}`}>Back to listing</NavLink>
                        </div>
                    </>
                }
    
                <form className='w3-container' auto-complete='off' onSubmit={submitData} encType='multipart/form-data'>
                    <div className='w3-padding-small w3-padding-top w3-margin-top'>
                        <label htmlFor='listingInfo-title'>* Title</label>
                        <input id='listingInfo-title' name='listingInfo-title' disabled={(isNotEditable('listingInfo-title'))} autoComplete='off'
                                required={true} maxLength={50} minLength={10} aria-required={true}
                                className='w3-input w3-input-theme-1' type='text' aria-label='Title' onChange={e=> handleChange(e)} value={listingInfo.title} />
                        {updateMode &&
                            getEditComponent('listingInfo-title')
                        }
                        <FieldError error={listingInfoErrors?.title} />
                    </div>
                    
                    <div className='w3-margin-top'>
                        <label htmlFor='listingInfo-transactionType'>* Transaction Type</label><br/>
                        <Dropdown
                            id='listingInfo-transactionType'
                            label='Transaction Type'
                            data={transactionTypes}
                            selected={listingInfo.transactionType} // Default selected transaction type
                            onItemSelected={transactionTypeSelected}
                            isDisabled={isNotEditable('listingInfo-transactionType')}
                            selReset={isNotEditable('listingInfo-transactionType')}
                            dropdownStyle={{backgroundColor: '#a6b9a0', color: '#000'}}
                        />
                        {updateMode &&
                            getEditComponent('listingInfo-transactionType')
                        }
                        <FieldError error={listingInfoErrors?.transactionType} />
                    </div>
                    
                    <div className='w3-margin-top'>
                        <label htmlFor='listingInfo-propertyType'>* Property Type</label><br/>
                        <Dropdown
                            id='listingInfo-propertyType'
                            label='Property Type'
                            data={propertyTypes}
                            selected={listingInfo.propertyType} 
                            onItemSelected={propertyTypeSelected}
                            isDisabled={isNotEditable('listingInfo-propertyType')}
                            selReset={isNotEditable('listingInfo-propertyType')}
                            dropdownStyle={{backgroundColor: '#a6b9a0', color: '#000'}}
                        />
                        {updateMode &&
                            getEditComponent('listingInfo-propertyType')
                        }                                
                        <FieldError error={listingInfoErrors?.propertyType} />
                    </div>
        
                    <div className='w3-padding-top-24'>
                        <h4>Price Info</h4>
                        <div>
                            <div className='w3-padding-small'>
                                <label htmlFor='priceInfo-regularPrice'>* Price (R)</label>
                                <input id='priceInfo-regularPrice' name='priceInfo-regularPrice' autoComplete='off' disabled={isNotEditable('priceInfo.regularPrice')} className='w3-input w3-input-theme-1' type='number' 
                                       aria-label='Price' required={true} aria-required={true} onChange={e=> handleChange(e)} value={priceInfo.regularPrice}  />
                                {updateMode &&
                                    getEditComponent('priceInfo.regularPrice')
                                }
                                <FieldError error={priceInfoErrors?.regularPrice} />
                            </div>
        
                            <div>
                                <h5>Offer (Optional)</h5>
                                <div>
                                    <div className='w3-padding-small side-by-side'>
                                        <label htmlFor='priceInfo-offer-discountedPrice'>Discounted Price (R)</label>
                                        <input id='priceInfo-offer-discountedPrice' name='priceInfo-offer-discountedPrice' autoComplete='off' disabled={isNotEditable('priceInfo.offer.discountedPrice')} className='w3-input w3-input-theme-1'
                                                type='number' aria-label='Discounted Price' onChange={e=> handleChange(e)} value={priceInfo.offer.discountedPrice} />
                                        {updateMode &&
                                            getEditComponent('priceInfo.offer.discountedPrice')
                                        }
                                        <FieldError error={priceInfoErrors?.offer?.discountedPrice} />
                                    </div>
                                    
                                    <div className='w3-padding-small side-by-side'>
                                        <label htmlFor='priceInfo-offer-appliesFor'>Applies For (month/months)</label>
                                        <input id='priceInfo-offer-appliesFor' name='priceInfo-offer-appliesFor' autoComplete='off' disabled={isNotEditable('priceInfo.offer.appliesFor')} className='w3-input w3-input-theme-1' type='number' 
                                                aria-label='Applies For' onChange={e=> handleChange(e)} value={priceInfo.offer.appliesFor} />

                                        {updateMode &&
                                            getEditComponent('priceInfo.offer.appliesFor')
                                        }
                                        <FieldError error={priceInfoErrors?.offer?.appliesFor} />
                                    </div>
                                    
                                    <div className='w3-padding-small side-by-side'>
                                        <label htmlFor='priceInfo-offer-expiryDate'>Offer expires on</label>
                                        <input id='priceInfo-offer-expiryDate' name='priceInfo-offer-expiryDate' autoComplete='off' disabled={isNotEditable('priceInfo.offer.expiryDate')} className='w3-input w3-input-theme-1' type='date' 
                                                aria-label='Expiry Date' onChange={e=> handleChange(e)} value={priceInfo.offer.expiryDate} />
                                        {updateMode &&
                                            getEditComponent('priceInfo-offer-expiryDate')
                                        }
                                        <FieldError error={priceInfoErrors?.offer?.expiryDate} />
                                    </div>
                                </div>       
                            </div>
                        </div>  
                    </div>
        
                    <div className='w3-padding-small padding-top-16'>
                        <label htmlFor='listingInfo-description'>* Description</label>
                        <textarea id='listingInfo-description' name='listingInfo-description' autoComplete='off' disabled={isNotEditable('listingInfo-description')}  required={true} aria-required={true} maxLength={250} minLength={50} className='w3-input w3-input-theme-1' type='text'
                                aria-label='Description' onChange={e=> handleChange(e)} value={listingInfo.description} />
                        {updateMode &&
                            getEditComponent('listingInfo-description')
                        }
                        <FieldError error={listingInfoErrors?.description} />
                    </div>
                                
                    <div className='w3-padding-small'>
                        <label htmlFor='specifications-numBedrooms'>* Number of bedrooms</label>
                        <input id='specifications-numBedrooms' name='specifications-numBedrooms' autoComplete='off' disabled={isNotEditable('specifications-numBedrooms')}  required={true} aria-required={true} className='w3-input w3-input-theme-1' type='number' 
                                aria-label='Number of bedrooms'  onChange={e=> handleChange(e)} value={specifications.numBedrooms} min={0} max={8} step={1}/>
                        {updateMode &&
                            getEditComponent('specifications-numBedrooms')
                        }
                        <FieldError error={specificationErrors?.numBedrooms} />
                    </div>                    
        
                    <div className='w3-padding-small'>
                        <label htmlFor='specifications-numBathrooms'>* Number of bathrooms</label>
                        <input id='specifications-numBathrooms' name='specifications-numBathrooms' autoComplete='off' disabled={isNotEditable('specifications-numBathrooms')}  required={true} aria-required={true} className='w3-input w3-input-theme-1' type='number' 
                                aria-label='Number of bathrooms'  onChange={e=> handleChange(e)} value={specifications.numBathrooms} min={0} max={8} step={1} />
                        {updateMode &&
                            getEditComponent('specifications-numBathrooms')
                        }
                        <FieldError error={specificationErrors?.numBathrooms} />
                    </div> 
        
                    <div className='w3-padding-small'>
                        <label htmlFor='specifications-parkingCapacity'>* Parking Capacity</label>
                        <input id='specifications-parkingCapacity' name='specifications-parkingCapacity' autoComplete='off'  disabled={isNotEditable('specifications-parkingCapacity')} required={true} aria-required={true} className='w3-input w3-input-theme-1' type='number' 
                                aria-label='Parking Capacity' onChange={e=> handleChange(e)} value={specifications.parkingCapacity} min={0} max={8} />
                        {updateMode &&
                            getEditComponent('specifications-parkingCapacity')
                        }
                        <FieldError error={specificationErrors?.parkingCapacity} />
                    </div>
        
                    <div className='w3-padding-small'>
                        <label htmlFor='specifications-garageCapacity'>Garage Capacity (Optional)</label>
                        <input id='specifications-garageCapacity' name='specifications-garageCapacity' autoComplete='off'  disabled={isNotEditable('specifications-garageCapacity')} className='w3-input w3-input-theme-1' type='number' 
                                aria-label='Parking Capacity' onChange={e=> handleChange(e)} value={specifications.garageCapacity} min={0} max={8} />
                        {updateMode &&
                            getEditComponent('specifications-garageCapacity')
                        }
                        <FieldError error={specificationErrors?.garageCapacity} />
                    </div>
        
                    <div className='w3-padding-small'>
                        <label htmlFor='specifications-totalFloorArea'>* Total Floor Area m<sup>2</sup></label>
                        <input id='specifications-totalFloorArea' name='specifications-totalFloorArea' autoComplete='off'  disabled={isNotEditable('specifications-totalFloorArea')} className='w3-input w3-input-theme-1' type='number' 
                                aria-label='Total Floor Area' onChange={e=> handleChange(e)} value={specifications.totalFloorArea} min={0} />
                        {updateMode &&
                            getEditComponent('specifications-totalFloorArea')
                        }
                        <FieldError error={specificationErrors?.totalFloorArea} />
                    </div>
        
                    <div className='w3-padding-small'>
                        <label htmlFor='specifications-erfSize'>Erf Size (Optional) m<sup>2</sup></label>
                        <input id='specifications-erfSize' name='specifications-erfSize' autoComplete='off' disabled={isNotEditable('specifications-erfSize')} className='w3-input w3-input-theme-1' type='number' 
                                aria-label='Erf Size (Optional)' onChange={e=> handleChange(e)} value={specifications.erfSize} min={0} />
                        {updateMode &&
                            getEditComponent('specifications-erfSize')
                        }
                        <FieldError error={specificationErrors?.erfSize} />
                    </div>
        
                    <div className=''>
                        <h4>Rates (Optional)</h4>
                        <div className=''>
                            <div className='w3-padding-small side-by-side'>
                                <label htmlFor='rates-utilityRates-amount'>Municipal Utilities (R)</label>
                                <input id='rates-utilityRates-amount' name='rates-utilityRates-amount' autoComplete='off' disabled={isNotEditable('rates.utilityRates.amount')} className='w3-input w3-input-theme-1'
                                        type='number' aria-label='Municipal Utility Amount' onChange={e=> handleChange(e)} value={rates.utilityRates.amount} />
                                {updateMode &&
                                    getEditComponent('rates.utilityRates.amount')
                                }
                                <FieldError error={rateErrors?.utilityRates?.amount} />
                            </div>
                            
                            <div className='w3-padding-small side-by-side'>
                                <label htmlFor='rates-utilityRates-frequency'>Billed Every (month/months)</label>
                                <input id='rates-utilityRates-frequency' name='rates-utilityRates-frequency' autoComplete='off' disabled={isNotEditable('rates.utilityRates.frequency')} className='w3-input w3-input-theme-1'
                                        type='number' aria-label='Municipal Utility Billing Frequency' onChange={e=> handleChange(e)} value={rates.utilityRates.frequency} />
                                {updateMode &&
                                    getEditComponent('rates.utilityRates.frequency')
                                }
                                <FieldError error={rateErrors?.utilityRates?.frequency} />
                            </div>
                        </div>
                        
                        <div className=''>
                            <div className='w3-padding-small side-by-side'>
                                <label htmlFor='rates-propertyTax-amount'>Property Tax (R)</label>
                                <input id='rates-propertyTax-amount' name='rates-propertyTax-amount' autoComplete='off' disabled={isNotEditable('rates.propertyTax.amount')} className='w3-input w3-input-theme-1'
                                        type='number' aria-label='Property Tax' onChange={e=> handleChange(e)} value={rates.propertyTax.amount} />
                                {updateMode &&
                                    getEditComponent('rates.propertyTax.amount')
                                }
                                <FieldError error={rateErrors?.propertyTax?.amount} />
                            </div>
                            
                            <div className='w3-padding-small side-by-side'>
                                <label htmlFor='rates-propertyTax-frequency'>Billed Every (month/months)</label>
                                <input id='rates-propertyTax-frequency' name='rates-propertyTax-frequency' autoComplete='off' disabled={isNotEditable('rates.propertyTax.frequency')} className='w3-input w3-input-theme-1'
                                        type='number' aria-label='Property Tax Billing Frequency' onChange={e=> handleChange(e)} value={rates.propertyTax.frequency} />
                                {updateMode &&
                                    getEditComponent('rates.propertyTax.frequency')
                                }
                                <FieldError error={rateErrors?.propertyTax?.frequency} />
                            </div>
                        </div>
                        
                        <div className=''>
                            <div className='w3-padding-small side-by-side'>
                                <label htmlFor='rates-associationFees-amount'>Association Fees (R)</label>
                                <input id='rates-associationFees-amount' name='rates-associationFees-amount' autoComplete='off' disabled={isNotEditable('rates.associationFees.amount')} className='w3-input w3-input-theme-1'
                                        type='number' aria-label='Association Fees' onChange={e=> handleChange(e)} value={rates.associationFees.amount} />
                                {updateMode &&
                                    getEditComponent('rates.associationFees.amount')
                                }
                                <FieldError error={rateErrors?.associationFees?.amount} />
                            </div>
                            
                            <div className='w3-padding-small side-by-side'>
                                <label htmlFor='rates-associationFees-frequency'>Billed Every (month/months)</label>
                                <input id='rates-associationFees-frequency' name='rates-associationFees-frequency' autoComplete='off' disabled={isNotEditable('rates.associationFees.frequency')} className='w3-input w3-input-theme-1'
                                        type='number' aria-label='Association Fees Billing Frequency' onChange={e=> handleChange(e)} value={rates.associationFees.frequency} />
                                {updateMode &&
                                    getEditComponent('rates.associationFees.frequency')
                                }
                                <FieldError error={rateErrors?.associationFees?.frequency} />
                            </div>
                        </div>
                    </div>
                    
                    <div className=''>
                        <h4>Address</h4>  
                        <div className='w3-padding-small'>
                            <label htmlFor='address-complexName'>Buiding or Complex Name (Optional)</label>
                            <input id='address-complexName' name='address-complexName' autoComplete='off' disabled={isNotEditable('address.complexName')} maxLength={50}  minLength={2} className='w3-input w3-input-theme-1' type='text' 
                                    aria-label='Building or Complex Name (Optional)' onChange={e=> handleChange(e)} value={address.complexName}  />
                            {updateMode &&
                                getEditComponent('address.complexName')
                            }
                            <FieldError error={addressErrors?.complexName} />
                        </div>
        
                        <div className='w3-padding-small'>
                            <label htmlFor='address-unitNo'>Unit No. (Optional)</label>
                            <input id='address-unitNo' name='address-unitNo' autoComplete='off' disabled={isNotEditable('address.unitNo')} maxLength={25} className='w3-input w3-input-theme-1' type='text' 
                                    aria-label='Unit Number (Optional)' onChange={e=> handleChange(e)} value={address.unitNo} />
                            {updateMode &&
                                getEditComponent('address.unitNo')
                            }
                            <FieldError error={addressErrors?.unitNo} />
                        </div>
        
                        <div className='w3-padding-small'>
                            <label htmlFor='address-streetNo'>* Street No.</label>
                            <input id='address-streetNo' name='address-streetNo' autoComplete='off' disabled={isNotEditable('address.streetNo')} required={true} aria-required={true} maxLength={10}
                                    className='w3-input w3-input-theme-1' type='text' aria-label='Street Number'
                                    onChange={e=> handleChange(e)} value={address.streetNo} />
                            {updateMode &&
                                getEditComponent('address.streetNo')
                            }
                            <FieldError error={addressErrors?.streetNo} />
                        </div>
                    
                        <div className='w3-padding-small'>
                            <label htmlFor='address-streetName'>Street Name (Optional)</label>
                            <input id='address-streetName' name='address-streetName' autoComplete='off' disabled={isNotEditable('address.streetName')} maxLength={50} minLength={2} 
                                    className='w3-input w3-input-theme-1' type='text' aria-label='Street Name (Optional)' onChange={e=> handleChange(e)}
                                    value={address.streetName} />
                            {updateMode &&
                                getEditComponent('address.streetName')
                            }
                            <FieldError error={addressErrors?.streetName} />
                        </div>
        
                        {provincesLoaded?
                            <div className='w3-padding-small'>
                                <label htmlFor='gisCodes-provincialCode'>* Province</label><br/>
                                <DropdownObj
                                    id='gisCodes-provincialCode'
                                    label='Province'
                                    sortFields={sortFields}
                                    data={provinces}
                                    selected={selectedProvince}
                                    displayName='name'
                                    valueName='code'
                                    onItemSelected={provinceSelected}
                                    isDisabled={isNotEditable('gisCodes.provincialCode')}
                                    selReset={isNotEditable('gisCodes.provincialCode')}
                                    dropdownStyle={{backgroundColor: '#a6b9a0', color: '#000'}}
                                />
                                {updateMode &&
                                    getEditComponent('gisCodes.provincialCode')
                                }
                                <FieldError error={gisCodeErrors?.provincialCode} />
                            </div>
                            :
                            <Loader message='Loading provinces ...' small={true} />
                        }
        
                        {municipalitiesLoaded?
                            <div className='w3-padding-small'>
                                <label htmlFor='address-municipalityCode'>* Municipality</label><br/>
                                <DropdownObj
                                    id='gisCodes-municipalityCode'
                                    label='Municipality'
                                    data={municipalities}
                                    sortFields={sortFields}
                                    displayName='name'
                                    valueName='code'
                                    onItemSelected={municipalitySelected} 
                                    selected={selectedMunicipality}
                                    isDisabled={isNotEditable('gisCodes.municipalityCode')}
                                    selReset={isNotEditable('gisCodes.municipalityCode')}
                                    dropdownStyle={{backgroundColor: '#a6b9a0', color: '#000'}}
                                />
                                {updateMode &&
                                    getEditComponent('gisCodes.municipalityCode')
                                }
                                <FieldError error={gisCodeErrors?.municipalityCode} />
                            </div>
                            :
                            <Loader message='Loading municipalities ...' small={true}/>
                        }
        
                        {mainPlacesLoaded?
                            <div className='w3-padding-small'>
                                <label htmlFor='gisCodes-mainPlaceCode'>* Main Place</label><br/>
                                <DropdownObj
                                    id='gisCodes-mainPlaceCode'
                                    label='Main Place'
                                    data={mainPlaces}
                                    displayName='name'
                                    valueName='code'
                                    sortFields={sortFields}
                                    onItemSelected={mainPlaceSelected} 
                                    selected={selectedMainPlace}
                                    isDisabled={isNotEditable('gisCodes.mainPlaceCode')}
                                    selReset={isNotEditable('gisCodes.mainPlaceCode')}
                                    dropdownStyle={{backgroundColor: '#a6b9a0', color: '#000'}}
                                />
                                {updateMode &&
                                    getEditComponent('gisCodes.mainPlaceCode')
                                }
                                <FieldError error={gisCodeErrors?.mainPlaceCode} />
                            </div>
                            :
                            <Loader message='Loading main places ...' small={true}/>
                        }
        
                        {subPlacesLoaded?
                            <div className='w3-padding-small'>
                                <label htmlFor='gisCodes-subPlaceCode'>* Sub Place</label><br/>
                                <DropdownObj
                                    id='gisCodes-subPlaceCode'
                                    label='Sub Place'
                                    data={subPlaces}
                                    displayName='name'
                                    valueName='code'
                                    sortFields={sortFields}
                                    onItemSelected={subPlaceSelected}
                                    selected={selectedSubPlace}
                                    isDisabled={isNotEditable('gisCodes.subPlaceCode')}
                                    selReset={isNotEditable('gisCodes.subPlaceCode')}
                                    dropdownStyle={{backgroundColor: '#a6b9a0', color: '#000'}}
                                />
                                {updateMode &&
                                    getEditComponent('gisCodes.subPlaceCode')
                                }
                                <FieldError error={gisCodeErrors?.subPlaceCode} />
                            </div>
                            :
                            <Loader message='Loading sub-places ...' small={true}/>
                        }
                    </div>
        
                    <div className=''>
                        <h4>Map Coordinates (Optional)</h4>
                        <div>
                            <div className='w3-padding-small side-by-side'>
                                <label htmlFor='mapCoordinates-latitude'>Latitude</label>
                                <input id='mapCoordinates-latitude' name='mapCoordinates-latitude' autoComplete='off' disabled={isNotEditable('mapCoordinates.latitude')} className='w3-input w3-input-theme-1' type='number' 
                                        aria-label='Latitude' onChange={e=> handleChange(e)} value={mapCoordinates.latitude}  />
                                {updateMode &&
                                    getEditComponent('mapCoordinates.latitude')
                                }
                                <FieldError error={mapCoordinateErrors?.latitude} />
                            </div>
        
                            <div className='w3-padding-small side-by-side'>
                                <label htmlFor='mapCoordinates-longitude'>Longitude</label>
                                <input id='mapCoordinates-longitude' name='mapCoordinates-longitude' autoComplete='off' disabled={isNotEditable('mapCoordinates.longitude')} maxLength={50} minLength={2} className='w3-input w3-input-theme-1' type='number' 
                                        aria-label='Longitude' onChange={e=> handleChange(e)} value={mapCoordinates.longitude} />
                                {updateMode &&
                                    getEditComponent('mapCoordinates-longitude')
                                }
                                <FieldError error={mapCoordinateErrors?.longitude} />
                            </div>
                        </div>  
                    </div>
        
                    <div>
                        {currentImages.length > 0 &&
                            <div>
                                <h4>Images</h4>
                                <div className='w3-padding-small w3-content w3-display-container'>
                                    {currentImages.map((image, index)=> {
                                            return (
                                                <img className='mySlides' 
                                                    key={`${image.name}${index}`}
                                                    src={image.url} 
                                                    alt={`image${index + 1}`}
                                                    style={{width: '100%',
                                                    display: (slideIndex === index? 'block':'none')}}/>
                                            );
                                        }) // currentImages.map((imageUrl, index)=> {
                                    }   
                                                             
                                    <button className="w3-button w3-black w3-display-left" type='button' onClick={e=> goNext(-1)}>&#10094;</button>
                                    <button className="w3-button w3-black w3-display-right" type='button' onClick={e=> goNext(1)}>&#10095;</button>
                                    <div className='w3-padding w3-margin'>
                                        <input type='checkbox' id='markForDeletion' name='markForDeletion' className='w3-input-theme-1' checked={currentImages[slideIndex]?.toDelete === true}
                                                onChange={e=> handleMarkedForDeletionClicked(e)} />
                                        <label htmlFor='markForDelection'> <BsTrash3/>Mark this image for Deletion</label>
                                    </div>
                                </div>
                            </div>
                        } 
                        
                        {((updateMode && attachImages && currentImages.length < 6)
                            || (!updateMode)) &&
                            <div className='w3-margin-top'>
                                <h4>Attach images</h4>
                                {imagesToUpload.length > 0 &&
                                    <div className='w3-padding w3-margin-top'>
                                        List of attached images
                                        <>
                                            {imagesToUpload.map((file, index)=> {
                                                const fileError = !allowedListingImageSize(file)?
                                                                    'File size not allowed!' 
                                                                    : // else if
                                                                    !allowedFileTypes.includes(file.type)?
                                                                        'File type not allowed!' 
                                                                        : // else
                                                                        null;
                                                return (
                                                    <div className='w3-input-theme-1 w3-padding-samll' key={`${file.name}${index}`} onClick={e=> removeImageToUpload(file)}>
                                                        <NavLink>
                                                            {file.name} : ({fileSizeMiB(file).toFixed(2)} MiB) {(fileError !== null) && <span><BiSolidError/>{fileError}</span>}<BsTrash3/>
                                                        </NavLink>
                                                    </div>
                                                );
                                            })}
                                        </>
                                    </div>
                                }
                                {(uploadingErrors?.length > 0) &&
                                    <div className='w3-padding-top'>
                                        {
                                            uploadingErrors.map((err, idx) => {
                                                return (
                                                    <div  key={idx} className='w3-padding-small'>
                                                        <FieldError error={err}/><br/>
                                                    </div>
                                                );
                                            })
                                        }
                                    </div>
                                }
                                <div className='w3-padding-small w3-margin-top'>
                                    <label htmlFor='image'>* Attach images <IoMdAttach/></label>
                                    <input id='imagesToUpload' name='imagesToUpload' multiple={true} disabled={imagesToUpload.length >= 6} className='w3-input w3-input-theme-1'
                                            type='file' aria-label='Upload image' onChange={e=> handleChange(e)} />
                                    <div>
                                        Allowed file types {allowedFileTypes.join(' ')}. Up to 1MiB
                                    </div>
                                </div>
                                <div>
                                    {(attachmentErrors?.length > 0) &&
                                        <div className='w3-padding-top'>
                                            {
                                                attachmentErrors.map((err, idx) => {
                                                    return (
                                                        <div key={idx} className='w3-padding-small'>
                                                            <FieldError error={err}/><br/>
                                                        </div>
                                                    );
                                                })
                                            }
                                        </div>
                                    }
                                </div>
                            </div>
                        }
                        {getAttachmentIcon()}
                    </div>               
                                
                    <div className='w3-padding'>
                        <button className='w3-btn w3-margin-small w3-theme-d5 w3-round' disabled={disableButton()} type='submit'>Save</button>
                    </div>

                    {listingUniqueId.current === null?                
                        <div className='w3-padding'>
                            <NavLink className="w3-btn w3-round w3-theme-d5" to={`/my-profile/listings`}>Back to my listings</NavLink>
                        </div>
                        :
                        <div className='w3-padding'>
                            <NavLink className="w3-btn w3-round w3-theme-d5" to={`/my-profile/listings/${listingUniqueId.current !== null? listingUniqueId.current : ''}`}>Back to listing</NavLink>
                        </div>
                    }
        
                </form>
                <ToastContainer/>
            </div>
        </Registered>
    );
}

export default AddOrEditListing;
