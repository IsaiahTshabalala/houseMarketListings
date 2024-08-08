/**
 * File: ./src/components/AddOrEditListing.js
 * Description: Enable creation and update of listings.
 * Date        Dev  Version  Description
 * 2023/12/15  ITA  1.00     Genesis
 * 2024/06/17  ITA  1.01     Add header comment. Rename the component Protected to Registered.
 *                           Clicked listing state to be updated after addition or update of listing.
 *                           Rename field docId to listingId.
 * 2024/07/07  ITA  1.02     Move function descriptions to the top, before each function.
 *                           Remove the sortField from the provinces, municipalities, mainPlace and subPlaces collection items.
 *                           Instead, use the name field for sorting. In keeping with improvements to the Collections class.
 *                           Update the listings sharedVar during the addition/update of a listing.
 * 2024/07/14  ITA  1.03     During the update or creation of a listing. The created listing must be placed at the right position on the sharedVar listings array.
 * 2024/08/07  ITA  1.04     Allow map coordinates to be populated optionally.
 */
import { doc, setDoc, Timestamp, deleteField } from 'firebase/firestore';
import { db, auth } from '../config/appConfig.js';
import { useState, useEffect, useContext, useRef } from 'react';
import { useLocation, useNavigate, useParams,  NavLink } from 'react-router-dom';
import { BsCheck, BsPencilFill, BsTrash3 } from 'react-icons/bs';
import { BiErrorCircle, BiSolidError } from 'react-icons/bi';
import { MdCancel } from 'react-icons/md';
import { IoMdAttach } from "react-icons/io";
import Dropdown from './Dropdown.js';
import Dropdown2 from './Dropdown2.js';
import { ToastContainer, toast } from 'react-toastify';
import toastifyTheme from './toastifyTheme.js';
import { v4 as uuidv4} from 'uuid';

import { objectFromFile, hasValues,
         isValidDescription, isValidShortDescription, isValidStreetNo,
         isValidName, isValidNumBedrooms, isValidNaturalNumber,
         isValidPositiveDecimalNumber, isValidDecimalNumber, deepClone, objCompare,
         fileSizeMiB, timeStampString, timeStampYyyyMmDd,binarySearchObj } from '../utilityFunctions/commonFunctions.js';

import { getAllProvinces, getMunicipalitiesPerProvince, 
         getMainPlacesPerMunicipality, getSubPlacesPerMainPlace,
         PROVINCES, MUNICIPALITIES, MAIN_PLACES, SUB_PLACES, LISTINGS,
         transactionTypes, propertyTypes,
         TRANSACTION_TYPES, PROPERTY_TYPES,
         CLICKED_LISTING} from '../utilityFunctions/firestoreComms.js';

import { uploadFiles, allowedListingImageSize, deleteFileOrFolder, deleteFiles } from '../utilityFunctions/cloudStorageComms.js'; // Facilitate cloud storage file uploads/downloads
import Loader from './Loader.js';
import { collectionsContext } from '../hooks/CollectionsProvider.js';
import { sharedVarsContext } from '../hooks/SharedVarsProvider.js';
import Registered from './Registered.js';
const loDash = require('lodash');

const init = {
    dateCreated: '',
    title: '',
    transactionType: '',
    propertyType: '',
    description: '',
    numBedrooms: '',
    numBathrooms: '',
    parkingCapacity: '',
    garageCapacity: '',
    totalFloorArea: '',
    erfSize: '',
    address: {
        complexName: '',
        unitNo: '',
        streetNo: '',
        streetName: '',
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
    images: [],
    userId: '', 
    flagged: false
}; // const init = {

const allowedFileTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function AddOrEditListing() {
    const location = useLocation();
    const navigate = useNavigate();
    const params = useParams();
    const [formData, setFormData] = useState(init);
    const [editableFields, setEditableFields] = useState({}); // Serves as the identifier of fields that were edited.
                                                            // and keeps the previous values of the edited fields before being saved
                                                            // or reverted back to.
    const [errors, setErrors] = useState({});
    const [updateMode, setUpdateMode] = useState(false); // updateMode = true, means an existing listing has been retrieved from the database,
                                                        // retrieved for possible update.
                                                        // updateMode = false, means that data is to be captured for a new listing. A new listing is being created.
    const [imagesToUpload, setImagesToUpload] = useState([]);
    const [loadingMessage, setLoadingMessage] = useState(null); // A message to be set while form data is being fetched.
                                                                // After form data has been loaded, set this state to null.
    const [uploadingErrors, setUploadingErrors] = useState(null);
    const [slideIndex, setSlideIndex] = useState(0);
    const listingUniqueId = useRef(null);
    const [attachImages, setAttachImages] = useState(false);

    /* Variables to be set to false while the provinces, municipalities, main places and sub-places data, respectively is being loaded.
       Set back to true after fetching data. */
    const [provincesLoaded, setProvincesLoaded] = useState(true); 
    const [municipalitiesLoaded, setMunicipalitiesLoaded] = useState(true);
    const [mainPlacesLoaded, setMainPlacesLoaded] = useState(true);
    const [subPlacesLoaded, setSubPlacesLoaded] = useState(true);

    /**The 'key' variables are used to cause dropdown component re-renders, when set, the respective dropdown will re-render */
    const [transactionTypesKey, setTransactionTypesKey] = useState(Math.random());
    const [propertyTypesKey, setPropertyTypesKey] = useState(Math.random())
    const [provincesKey, setProvincesKey] = useState(Math.random());
    const [municipalitiesKey, setMunicipalitiesKey] = useState(Math.random());
    const [mainPlacesKey, setMainPlacesKey] = useState(Math.random());
    const [subPlacesKey, setSubPlacesKey] = useState(Math.random());
    const keyStep = 0.0000001;

    const {addCollection, getCollectionData, updateCollection, setSelected,
            getSelected, collectionExists} = useContext(collectionsContext);
    const {addVar, getVar, varExists, updateVar} = useContext(sharedVarsContext);

    const firstRender = useRef(true);
    const listingSortFields = ['dateCreated desc', 'listingId desc'];
    const placeSortFields = ['name asc'];

    function goNext(next) { // Go to the next slide by 1 step.
        let index;
        if (next < 0)
            index = -1;
        else if (next > 0)
            index = 1;
        
        index += slideIndex;
        if (index < 0)
            index = formData.images.length - 1;
        else if (index > formData.images.length - 1)
            index = 0;

        setSlideIndex(index);
    } // function goNext(next) {
    
    function fieldsEdited() { // Indicate whether there any fields that were edited on the form.
        return hasValues(editableFields); // determine if editableFields has any values.
    }

    function handleMarkedForDeletionClicked(e) {
        const data = deepClone(formData);
        const images = data.images;

        if (e.target.checked)
            images[slideIndex].toDelete = true;
        else
            delete images[slideIndex]['toDelete'];

        setFormData(data);
        validate();
    } // function handleMarkedForDeletionClicked(e)

    function disableButton() {
        if (updateMode === false)// If this is a new Listing data entry. Enable the Save button.
            return false;

        // else: Listng update.

        if (fieldsEdited()
            || (attachImages && imagesToUpload.length > 0)) // If there were any fields that were edited, any images that were attached, enable the Save button.
            return false;
        
        // If the were any listing images marked for deletion, enable the Save button.
        if (formData.images.find(image=> {
            return image.toDelete === true;
        }) !== undefined) {
            return false;
        }

        return true;
    } // function disableButton()

    function toggleEditable(fieldPath) {
    // Toggle field editability as follows:
    // If the fieldPath is found in editable fields, restore field's previous value and remove the field from editable fields.
    // Else if a field is not found in editable fields, copy it with its value to the editable fields.
        let data;

        if (isEditable(fieldPath)){
            // Restore the previous form field value.
            data = deepClone(formData);
            const value = loDash.get(editableFields, fieldPath);
            loDash.set(data, fieldPath, value);
            setFormData(data);
    
            // Remove the field from editable fields
            data = deepClone(editableFields);
            loDash.unset(data, fieldPath); // Remove path from editableFields
            setEditableFields(data);
    
            // Also remove any associated errors from editableField
            data = deepClone(errors);
            loDash.unset(data, fieldPath);
            setErrors(data);
        } // if (isEditable(fieldPath)){
        else { // Store the current value in editable fields
            const value = loDash.get(formData, fieldPath);
            data = deepClone(editableFields);
            loDash.set(data, fieldPath, value);
            setEditableFields(data);
        } // else
    } // function toggleEditable(fieldPath)

    function isEditable(fieldPath) {
    // Basically check if a fieldpath exists in the editableFields object.
        
        if (!updateMode) // Meaning this is a new listing data capture. Return true.
            return true;
            
        return loDash.get(editableFields, fieldPath) !== undefined;
    } // function isEditable(fieldPath)

    function isNotEditable(fieldPath) {
        return !isEditable(fieldPath);
    } // function isNotEditable(fieldPath)


    function getEditIcon(fieldPath) {
        // Return the right html to display the edit/cancel icon with its functionality.
        if (updateMode) {
          const icon = (isEditable(fieldPath))?  <><MdCancel/>Cancel Edit</> 
                                                        : <><BsPencilFill/>Edit</>;
          return (
            <span className='w3-btn w3-small w3-text-black' onClick={e=> {toggleEditable(fieldPath)}}>
              {icon}
            </span>
          );
        } // if (updateMode)
    
        return null;
    } // function getEditIcon(fieldPath)

    function getAttachmentIcon() {
        // Return the right html to display the Attach or Cancel Attachments icon with its functionality.
        if (updateMode && formData.images.length < 6) {
          const icon = attachImages? <><MdCancel/>Cancel Attachments</>
                                     : <><IoMdAttach/>Attach Images</>;
          return (
            <span className='w3-btn w3-small w3-text-black w3-margin-top' onClick={e=> {toggleAttachImages()}}>
              {icon}
            </span>
          );
        } // if (updateMode)
    
        return null;
    } // function getAttachmentIcon() {

    function toggleAttachImages() {
        setAttachImages(!attachImages);

        if (!attachImages)
            setImagesToUpload([]);
        
    } // function toggleAttachImages() {

    function showErrorIcon(fieldPath) {
        const field = loDash.get(errors, fieldPath);
        if (field !== undefined) 
            return (
                <div className='w3-small w3-text-black'>
                    <BiErrorCircle/>{field}
                </div>
            );

        return (
            <div className='w3-small w3-text-black' style={{opacity: '0'}}>
                <BsCheck/>
            </div>
        );
    } //  function showErrorIcon(fieldPath)
    
    /**Function called upon the selection of a province in the provinces dropdown, so as to update the
     * municipalities displayed in the municipalities dropdown to those of the selected province.
     */
    async function provinceSelected() {
        try {
            // Get the currently selected province. From the collectionsContext.
            let selectedProvince = null;
            const result = getSelected(PROVINCES);
            if (result.length > 0)
                selectedProvince = result[0];
    
            if (selectedProvince === null)
                return; // Do not proceed if selected province not found.
    
            if (formData.address.provincialCode === selectedProvince.code) // Do not proceed if there was no real change in the selection of the provincial code.
                return;
            
            const newFormData = deepClone(formData);
            newFormData.address.provincialCode = selectedProvince.code; // Update the form provincial code to the currently selected one.
            setFormData(newFormData);
    
            // Load municipalities belonging to the selected provincial code.
            setMunicipalitiesLoaded(false);
            let municipalities = [];
            municipalities = await getMunicipalitiesPerProvince(newFormData.address.provincialCode);
    
            // Update the municipalities shared collection in the collectionsContext hook.
            updateCollection(MUNICIPALITIES, municipalities);
        } catch (error) {
            toast.error(error, toastifyTheme);            
        } finally {
            setMunicipalitiesKey(municipalitiesKey + keyStep); // Re-render the municipalities dropdown.
            setMunicipalitiesLoaded(true);
        } // finally
    } // function provinceSelected() {

    /** Function called upon the selection of the municipality in the municipalities dropdown. 
     * To update the main places displayed the main places dropdown to those of the selected municipality.
    */
    async function municipalitySelected() {
        
        try {
            // Get the currently selected municipality.
            let selectedMunicipality = null;
            const result = getSelected(MUNICIPALITIES);
            if (result.length > 0)
                selectedMunicipality = result[0];
    
            if (selectedMunicipality === null)
                return; // Do not proceed if no selected municipality found.
    
            if (formData.address.municipalityCode === selectedMunicipality.code) // Do not proceed if there was no real change in the selection of the municipality code.
                return;
    
            const newFormData = deepClone(formData);
            newFormData.address.municipalityCode = selectedMunicipality.code; // Update the municipality code to the currently selected one.
            setFormData(newFormData);
    
            // Load all the main places of the municipality
            setMainPlacesLoaded(false);
            let mainPlaces = [];
            mainPlaces = await getMainPlacesPerMunicipality(newFormData.address.provincialCode, newFormData.address.municipalityCode);
            updateCollection(MAIN_PLACES, mainPlaces);

        } catch (error) {
            toast.error(error, toastifyTheme);
        } finally {    
            setMainPlacesKey(mainPlacesKey + keyStep);
            setMainPlacesLoaded(true);
        }
    } // async function municipalitySelected() {
    
    /**Function called upon the selection of a main place in the main places dropdown.
     * To update the sub-places displayed in the sub-places dropdown to those of the selected main place.
    */
    async function mainPlaceSelected() {

        try {
            // Get the currently selected main place.
            let selectedMainPlace = null;
            const result = getSelected(MAIN_PLACES);
            if (result.length > 0)
                selectedMainPlace = result[0];
    
            if (selectedMainPlace === null) // Do not proceed if selected main place not found.
                return;
    
            if (formData.address.mainPlaceCode === selectedMainPlace.code) // Do not proceed if there was no real change in the selection of the main place code.
                return;
    
            const newFormData = deepClone(formData);
            newFormData.address.mainPlaceCode = selectedMainPlace.code; // update the main place code to the currently selected main place code.
    
            setFormData(newFormData);
            // Load all the sub-places of the main place of the municipality
            setSubPlacesLoaded(false);
            let subPlaces = [];
            subPlaces = await getSubPlacesPerMainPlace(newFormData.address.provincialCode, newFormData.address.municipalityCode, 
                                                        newFormData.address.mainPlaceCode);
            
            updateCollection(SUB_PLACES, subPlaces);            
        } catch (error) {
            toast.error(error, toastifyTheme);
        } finally {
            setSubPlacesKey(subPlacesKey + keyStep);
            setSubPlacesLoaded(true);
        } // finally
    } // async function mainPlaceSelected(code) {

    async function selectSubPlaceCode() {
        // Function to be called upon the selection of a sub-place in the sub-places dropdown.        
        try {
            // Get the selected sub-place...
            let selectedSubPlace = null;
            const result = getSelected(SUB_PLACES);
            if (result.length > 0)
                selectedSubPlace = result[0];
    
            if (selectedSubPlace === null)
                return; // Exit if selected sub-place not found. 
    
            if (formData.address.subPlaceCode === selectedSubPlace.code) // Do not proceed if there was no real change in the sub-place code selection.
                return;
    
            const newFormData = deepClone(formData);
            newFormData.address.subPlaceCode = selectedSubPlace.code; // Update the sub-place code to the currently selected sub-place.
            setFormData(newFormData);            
        } catch (error) {
            toast.error(error, toastifyTheme);
        } // catch (error)
    } // async function selectSubPlaceCode(code) {

    function handleChange(e) {
    // Update the formData object as the user types in the data.
        let data = deepClone(formData);
        const fieldPath = e.target.name.replace(/-/g, '.'); 
                                // e.g. priceInfo-regularPrice to be replaced with priceInfo.regularPrice.

        if (e.target.name !== 'image') { // Form fields
            loDash.set(data, fieldPath, e.target.value);            
            setFormData(data);
        } // if (e.target.name !== 'image') {
        else {
            const imageFiles = [...imagesToUpload];
            for (let idx = 0; idx < e.target.files.length; idx++) {
                const file = e.target.files[idx];
                if (imageFiles.length === 0)
                    imageFiles.push(file); // Add if file if array is empty
                else {
                    if (imageFiles.find(imgFile=> {
                        return loDash.isEqual(objectFromFile(file), objectFromFile(imgFile));
                    }) === undefined)
                    imageFiles.push(file);
                } // else {
            } // for (let idx = 0; idx < e.target.files.length; idx++)
 
            setImagesToUpload(imageFiles);
        } // else 
        validate();
    } // function handleChange(e) {

    async function transactionTypeSelected() {
        try {
            let transactionType = null;
            const result = getSelected(TRANSACTION_TYPES);
            if (result.length > 0)
                transactionType = result[0];
            
            if (transactionType === null)
                return;
    
            if (transactionType === formData.transactionType)
                return;  // No change in selection. Exit.
    
            setFormData(deepClone({...formData, transactionType}));
            validate();            
        } catch (error) {
            toast.error(error, toastifyTheme);
        }
    } // async function transactionTypeSelected()

    async function propertyTypeSelected() {
        try {
            let propertyType = null;
            const result = getSelected(PROPERTY_TYPES);
            if (result.length > 0)
                propertyType = result[0];
            if (propertyType === null)
                return;
    
            if (propertyType === formData.propertyType)
                return;
    
            setFormData(deepClone({...formData, propertyType}));
            validate();
        } catch (error) {
            toast.error(error, toastifyTheme);
        }
    } // function propertyTypeSelected(propertyType)

    async function validate() {
        const checkList = {}; // Initialise to an empty object. Populate fields as errors get encountered.

        try {
            if (!isValidShortDescription(formData.title))
                checkList.title = 'Invalid title';
    
            let transTypes = [];
            transTypes = getCollectionData(TRANSACTION_TYPES);
            if (!transTypes.includes(formData.transactionType))
                checkList.transactionType = 'Invalid transaction type';
    
            let propTypes = [];
            propTypes = getCollectionData(PROPERTY_TYPES);        
            if (!propTypes.includes(formData.propertyType))
                checkList.propertyType = 'Invalid property type';

            if ((checkList.propertyType === undefined)
                && (checkList.transactionType === undefined)) {
                if (formData.propertyType === 'Room' && formData.transactionType === 'Sale')
                    checkList.transactionType = 'A room cannot be for sale! Can only be rented.'
            }
    
            if (!isValidDescription(formData.description))
                checkList.description = 'Invalid description';
    
            if (!isValidNumBedrooms(formData.numBedrooms))
                checkList.numBedrooms = 'Invalid number of bedrooms';
            
            if (!isValidNumBedrooms(formData.numBathrooms))
                checkList.numBathrooms = 'Invalid number of bathrooms';
    
            if (!isValidNumBedrooms(formData.parkingCapacity))
                checkList.parkingCapacity = 'Invalid parking capacity';
    
            if (formData.garageCapacity !== '' && !isValidNumBedrooms(formData.garageCapacity))
                checkList.garageCapacity = 'Invalid garage capacity';
    
            if (!isValidNaturalNumber(formData.totalFloorArea))
                checkList.totalFloorArea = 'Invalid total floor area';
    
            if (formData.erfSize !== '' && !isValidNaturalNumber(formData.erfSize))
                checkList.erfSize = 'Invalid Erf size';
    
            
            if (formData.address.complexName !== '' && !isValidName(formData.address.complexName))
                loDash.set(checkList, 'address.complexName', 'Invalid complex name');
    
            if (formData.address.unitNo !== '' && !isValidStreetNo(formData.address.unitNo))
                loDash.set(checkList, 'address.unitNo', 'Invalid unit number');
            
            if (!isValidStreetNo(formData.address.streetNo))
                loDash.set(checkList, 'address.streetNo', 'Invalid street number');
    
            if (formData.address.streetName !== '' && !isValidShortDescription(formData.address.streetName))
                loDash.set(checkList, 'address.streetName', 'Invalid street name');
    
            let provinces = [];
            provinces = getCollectionData(PROVINCES);    
            if (provinces.findIndex(province=> {
                return province.code === formData.address.provincialCode;
            }) < 0)
                loDash.set(checkList, 'address.provincialCode', 'Please choose a valid province!');
    
            let municipalities = [];
            municipalities = getCollectionData(MUNICIPALITIES);
    
            if (municipalities.findIndex(municipality=> {
                return municipality.code === formData.address.municipalityCode;
            }) < 0)
                loDash.set(checkList, 'address.municipalityCode', 'Please choose a valid municipality!');
    
            let mainPlaces = [];
            mainPlaces = getCollectionData(MAIN_PLACES);            
            if (mainPlaces.findIndex(mainPlace=> {
                return mainPlace.code === formData.address.mainPlaceCode;
            }) < 0)
                loDash.set(checkList, 'address.mainPlaceCode', 'Please choose a valid main place!');
            
            let subPlaces = [];
            subPlaces = getCollectionData(SUB_PLACES);
    
            if (subPlaces.findIndex(subPlace=> {
                return subPlace.code === formData.address.subPlaceCode;
            }) < 0)
                loDash.set(checkList, 'address.subPlaceCode', 'Please choose a valid sub-place!');
    
            if (!isValidPositiveDecimalNumber(formData.priceInfo.regularPrice))
                loDash.set(checkList, 'priceInfo.regularPrice', 'Invalid price');
    
            // If the user provides an offer, then all the offer fields must be populated.
            if (formData.priceInfo.offer.discountedPrice !== '' 
                || formData.priceInfo.offer.appliesFor !== '' || formData.priceInfo.offer.expiryDate !== '') {
    
                if (!isValidPositiveDecimalNumber(formData.priceInfo.offer.discountedPrice))
                    loDash.set(checkList, 'priceInfo.offer.discountedPrice', 'Invalid discounted price');
                else if (Number.parseFloat(formData.priceInfo.offer.discountedPrice) 
                            >= formData.priceInfo.regularPrice)
                    loDash.set(checkList, 'priceInfo.offer.discountedPrice',
                                            'Discounted price cannot be more than the regular price');
    
                if (!isValidNaturalNumber(formData.priceInfo.offer.appliesFor))
                    loDash.set(checkList, 'priceInfo.offer.appliesFor', 'Invalid Applies For');
    
                // validating expiry date...
                try {
                    const currMilliSec = Date.now(); // Current date and time in milliseconds.
    
                    const dateRegEx = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
                    if (!dateRegEx.test(formData.priceInfo.offer.expiryDate))
                        throw new Error('Invalid offer expiry date');
    
                    const expiryDate = new Date(formData.priceInfo.offer.expiryDate);
                    const expiryDateMilliSec = expiryDate.getTime();
                    
                    if (expiryDateMilliSec < currMilliSec || isNaN(expiryDate)) 
                        loDash.set(checkList, 'priceInfo.offer.expiryDate', 'Offer expiry date must be in the future');
                        
                } catch (error) {
                    loDash.set(checkList, 'priceInfo.offer.expiryDate', 'Invalid offer expiry date');
                } // catch(error)
            } // if (formData.priceInfo.offer.discountedPrice !== ''
            
            if (formData.rates.utilityRates.amount !== ''
                || formData.rates.utilityRates.frequency !== '') {
                
                if (!isValidPositiveDecimalNumber(formData.rates.utilityRates.amount))
                    loDash.set(checkList, 'rates.utilityRates.amount', 'Invalid utility rate amount');
    
                if (!isValidNaturalNumber(formData.rates.utilityRates.frequency))
                    loDash.set(checkList, 'rates.utilityRates.frequency', 'Invalid utility billing frequency');
                else if (!(Number.parseInt(formData.rates.utilityRates.frequency) <= 12))
                    loDash.set(checkList, 'rates.utilityRates.frequency', 'Must be 1 to 12 months');
            } // if (formData.rates.utilityRates.amount !== '' || formData.rates.utilityRates.frequency !== '') {
    
            if (formData.rates.propertyTax.amount !== '' || formData.rates.propertyTax.frequency !== '') {
                if (!isValidPositiveDecimalNumber(formData.rates.propertyTax.amount))
                    loDash.set(checkList, 'rates.propertyTax.amount', 'Invalid property tax rate amount');
    
                if (!isValidNaturalNumber(formData.rates.propertyTax.frequency))
                    loDash.set(checkList, 'rates.propertyTax.frequency', 'Invalid property tax billing frequency');
                else if (!(Number.parseInt(formData.rates.propertyTax.frequency) <= 12))
                    loDash.set(checkList, 'rates.propertyTax.frequency', 'Must be 1 to 12 months');
            } // if (formData.rates.propertyTax.amount !== '' || formData.rates.propertyTax.frequency !== '') {
    
            if (formData.rates.associationFees.amount !== '' || formData.rates.associationFees.frequency !== '') {
                if (!isValidPositiveDecimalNumber(formData.rates.associationFees.amount))
                    loDash.set(checkList, 'rates.associationFees.amount', 'Invalid property tax rate amount');
    
                if (!isValidNaturalNumber(formData.rates.associationFees.frequency))
                    loDash.set(checkList, 'rates.associationFees.frequency', 'Invalid association fees billing frequency');
                else if (!(Number.parseInt(formData.rates.associationFees.frequency) <= 12))
                    loDash.set(checkList, 'rates.associationFees.frequency', 'Must be 1 to 12 months');
            } // if (formData.rates.associationFees.amount !== '' || formData.rates.associationFees.frequency !== '') {
            
            if (formData.mapCoordinates.latitude !== '' || formData.mapCoordinates.longitude !== '') {
                if (!isValidDecimalNumber(formData.mapCoordinates.latitude))
                    loDash.set(checkList, 'mapCoordinates.latitude', 'Invalid latitude');
        
                if (!isValidDecimalNumber(formData.mapCoordinates.longitude))
                    loDash.set(checkList, 'mapCoordinates.longitude', 'Invalid longitude');
            } // if (formData.mapCoordinates.latitude !== '' || formData.mapCoordinates.longitude !== '') {
    
            const numImagesForDeletion = formData.images.filter(image=> {
                return image.toDelete === true;
            }).length;
    
            const spaceLeft = 6 - formData.images.length - imagesToUpload.length + numImagesForDeletion;
            if (spaceLeft < 0) {
                loDash.set(checkList,
                            'imagesToUpload',
                            `Allowed number of images + uploads exceeded! Please remove ${Math.abs(spaceLeft)} image/s`);
            } // if (spaceLeft < 0) {
            else if (spaceLeft > 4) {
                loDash.set(checkList,
                            'imagesToUpload',
                            `Please upload at least 2 images!`);
            } // else if (spaceLeft >= 4) {
            for (const idx in imagesToUpload) {
                const file = imagesToUpload[idx];
                if (!allowedListingImageSize(file)) {
                    loDash.set(checkList, 'fileSizeError', 'Some of your images exceed the allowed file size!');
                    return;
                } // if (!allowedListingImageSize(imgFile)) {
                if (!allowedFileTypes.includes(file.type)) {
                    loDash.set(checkList, 'fileTypeError', 'One or more of your uploaded files is not the allowed type!');;
                } // if (!allowedFileTypes.includes(file.type)) {
            } // for (const idx in imagesToUpload) {
            
            setErrors(checkList);
            return !hasValues(checkList);            
        } catch (error) {
            toast.error(error, toastifyTheme)
            return false;
        }
    } // async function validate() {

    function removeImageToUpload(imageToRemove) {
        const updatedImageList = imagesToUpload.filter(image=> {
                                        return !loDash.isEqual(imageToRemove, image);
                                    });
        setImagesToUpload(updatedImageList);
        validate();
    } // function removeImageToUpload(fileName) {
    
    async function submitData(e) {
        
        e.preventDefault();
        if (!(await validate())) {
            toast.error('Could not submit your data. Please check your input and try again!', toastifyTheme);
            return;
        } // if (!validate()) {
        
        setLoadingMessage(updateMode? 'Updating your listing ...' : 'Creating a new listing ...');
        let errorFound = false;
        const data = deepClone(formData); // Create an object that is a true clone, an object that is completely unrelated to its source.
        // This ensures that any removal of fields in data object do not affect formData.
        if (data.dateCreated !== '') {
            const dateCreated = new Date(data.dateCreated); // data.dateCreated is of the form yyyy-MM-ddTmm:hh:ss
            data.dateCreated = Timestamp.fromDate(dateCreated);
        } // if (data.dateCreated !== '') {
        else
            data.dateCreated = Timestamp.fromDate(new Date());
        
        data.priceInfo.regularPrice = Number.parseFloat(data.priceInfo.regularPrice); // Convert to decimal number

        // ATTENTION: By Listing update, it means the data that is to be submitted to Firestore for an update.
        // Process price offer optional fields accordingly...
        if (data.priceInfo.offer.discountedPrice === '') { // Listing update has no offer.
            if (loDash.get(editableFields, 'priceInfo.offer') !== undefined
                && loDash.get(editableFields, 'priceInfo.offer') !== '') // Previous listing data has an offer.
                data.priceInfo.offer = deleteField(); // To instruct Firestore to delete the listing offer during update.
            else
                loDash.unset(data, 'priceInfo.offer'); // Clear offer data from the listing update. It is just blanks ''.
        } // if (loDash.get(editableFields, 'priceInfo.offer.discountedPrice') !== '') {
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
            if (editableFields.garageCapacity !== undefined
                && editableFields.garageCapacity !== '') // Previous listing data had garage capacity
                data.garageCapacity = deleteField(); // To instruct Firestore to remove this field during update.
            else
                loDash.unset(data, 'garageCapacity'); // Clear this field from the listing update. Has been blank before update, and still is.
        } // if (data.garageCapacity === '') {
        else // Garage capacity data has been provided. Convert to integer type
            data.garageCapacity = Number.parseInt(data.garageCapacity);

        data.totalFloorArea = Number.parseInt(data.totalFloorArea);        
        // Handle the optional field accordingly
        if (data.erfSize === '') {    // listing update has no Erf size.
            if (editableFields.erfSize !== undefined && editableFields.erfSize !== '') // Previous listing data had the Erf size.
                data.erfSize = deleteField(); // To instruct Firestore to remove this field during update.
            else
                loDash.unset(data, 'erfSize'); // Clear this field the listing update. I was blank before update and remains so.
        } // if (data.erfSize === '') {
        else // Erf size has been provided. Convert to integer type.
            data.erfSize = Number.parseInt(data.erfSize);

        // Process the municipal utility rates (optional) accordingly...
        if (data.rates.utilityRates.amount === '') { // Listing update has no municipal utility rates
            if (loDash.get(editableFields, 'rates.utilityRates') !== undefined
                && loDash.get(editableFields, 'rates.utilityRates') !== '') // Previous listing data has utility rates.
                data.rates.utilityRates = deleteField(); // To instruct Firestore to delete the listing utility rates during update.
            else
                loDash.unset(data, 'rates.utilityRates'); // Clear utility rates data from the listing update. It is just blanks ''.
        } // f (data.rates.utilityRates.amount === '')
        else { // Convert utility rates data accordingly
            data.rates.utilityRates.amount = Number.parseFloat(data.rates.utilityRates.amount);
            data.rates.utilityRates.frequency = Number.parseInt(data.rates.utilityRates.frequency);
        } // else

        // Process the property tax rates (optional) accordingly...
        if (data.rates.propertyTax.amount === '') { // Listing update has no property tax rates
            if (loDash.get(editableFields, 'rates.propertyTax') !== undefined
                && loDash.get(editableFields, 'rates.propertyTax') !== '') // Previous listing data has property tax rates.
                data.rates.propertyTax = deleteField(); // To instruct Firestore to delete the listing property tax rates during update.
            else
                loDash.unset(data, 'rates.propertyTax'); // Clear property tax rates data from the listing update. It is just blanks ''.
        } // if (loDash.get(editableFields, 'rates.propertyTax') !== '') {
        else { // Convert property tax rates data accordingly
            data.rates.propertyTax.amount = Number.parseFloat(data.rates.propertyTax.amount);
            data.rates.propertyTax.frequency = Number.parseInt(data.rates.propertyTax.frequency);
        } // else

        // Process the association fees (optional) accordingly...
        if (data.rates.associationFees.amount === '') { // Listing update has no association fees
            if (loDash.get(editableFields, 'rates.associationFees') !== undefined
                && loDash.get(editableFields, 'rates.associationFees') !== '') // Previous listing data has association fees.
                data.rates.associationFees = deleteField(); // To instruct Firestore to delete the listing association fees during update.
            else
                loDash.unset(data, 'rates.associationFees'); // Clear association fees data from the listing update. It is just blanks ''.
        } // if (loDash.get(editableFields, 'rates.associationFees') !== '') {
        else { // Convert association fees data accordingly
            data.rates.associationFees.amount = Number.parseFloat(data.rates.associationFees.amount);
            data.rates.associationFees.frequency = Number.parseInt(data.rates.associationFees.frequency);
        } // else
        
        if (!hasValues(data.rates)) // If the rates fieldPath is empty, clear it.
            loDash.unset(data, 'rates');

        ['address.complexName', 'address.unitNo', 'address.streetName'].forEach(fieldPath=> {
            if (loDash.get(data, fieldPath) === '') {
                if (loDash.get(editableFields, fieldPath) !== undefined
                    && loDash.get(editableFields, fieldPath) !== '')  // There was a complexName prior to listing update
                    loDash.set(data, fieldPath, deleteField()); // Instruct Firestore to delete the field during update.
                else
                    loDash.unset(data, fieldPath); // Remove the field from the listing update.
            } // if (data.address.complexName === '') {
        });

        // Convert latitude and longitude to decimal numbers
        if (data.mapCoordinates.latitude === '') { // No map coordinates provided. Testing with only 1 of the map coordinates suffices.
            if (loDash.get(editableFields, 'mapCoordinates.latitude') !== undefined // This listing previously had map coordinates.
                && loDash.get(editableFields, 'mapCoordinates.latitude') != '')
                data.mapCoordinates = deleteField(); // Instruct Firestore to delete mapCoordinates field.
            else
                loDash.unset(data, 'mapCoordinates'); // Remove field from listing update.
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
        const filesToDelete = data.images.filter(image=> {
            return image.toDelete === true;  // return true if marked for deletion.
        });

        if (filesToDelete.length > 0) { // If there were any files marked for deletion, delete them.
            const deleteResult = await deleteFiles(filesToDelete);
            if (deleteResult.deletedFiles.length > 0) {
                data.images = data.images.filter(image=> { // Remove files found in deleted files.
                    for (const idx in deleteResult.deletedFiles) {
                        const delFile  = deleteResult.deletedFiles[idx];
                        if (image.url === delFile.url)
                            return false; // File found in deleted files.
                    } // for (const idx in deleteResult.deletedFiles) {

                    return true; // File not found in deleted files.

                }); // data.images = data.images.filter(image=> {
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
            errorFound = true;
            
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
                    data.images.push({fileName, url});
                } // for (const idx in downloadUrls) {
            } // if (hasValues(uploadResult) && uploadResult.downloadUrls.length > 0) {

            const docRef = doc(db, '/listings', uid);
        
            await setDoc(docRef, data, {merge: true})
                .then(result=> {
                    setLoadingMessage(null);
                    setEditableFields({});
                    setUpdateMode(true);
                    setImagesToUpload([]);
                    const newFormData = deepClone(formData);
                    newFormData.images = data.images;

                    if (newFormData.dateCreated === '') {
                        const dateCreated = timeStampString(data.dateCreated.toDate());
                        newFormData.dateCreated = dateCreated;
                    }
                    setFormData(newFormData);
                    listingUniqueId.current = uid;

                    // Update the value of clickedListing.
                    updateClickedListing(data);
                    const msg = updateMode? 'Congratulations! Your listing has been updated!'
                                            : 'Success! Your listing has been created!';                    
                    toast.success(msg, toastifyTheme);

                }) // .then(result=> {
                .catch(error=> {
                    setLoadingMessage(null);
                    console.log(error);
                    toast.error('An error occured. Please try again or contact Support.', toastifyTheme);
                    errorFound = true;
                });
        } // else
    } // function submitData() {

    async function updateClickedListing(newData) {
        newData.listingId = listingUniqueId.current;
        let province = getSelected(PROVINCES)[0],
            municipality = getSelected(MUNICIPALITIES)[0],
            mainPlace = getSelected(MAIN_PLACES)[0],
            subPlace = getSelected(SUB_PLACES)[0];

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

        if (!varExists(CLICKED_LISTING))
            addVar(CLICKED_LISTING, newData);
        else
            updateVar(CLICKED_LISTING, newData);

        if (varExists(LISTINGS)) { // Update the listings shared var accordingly.
            const theListings = [...getVar(LISTINGS)];
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
            updateVar(LISTINGS, theListings);
        } // if (varExists(LISTINGS)) {
    } // function updateClickedListing(data) {
    
    useEffect(() => {
        (async ()=> {
            if (firstRender.current === true) {

                if ((location.pathname === `/my-profile/listings/${params.listingId}/edit`) && (!varExists('clickedListing')))
                    navigate('/my-profile/listings');
                
                firstRender.current = false;
                // Collections added by order in which their dropdowns appear in the form.
                if (!collectionExists(TRANSACTION_TYPES)) {
                // Use this condition above as to determine whether the collecitions data was retrieved.

                    try {
                        // Add the transaction types collection
                        addCollection(TRANSACTION_TYPES, transactionTypes, 1, true, 'asc')
                        // Add the property types collection
                        addCollection(PROPERTY_TYPES, propertyTypes, 1, true, 'asc');
    
                        // Get the provinces from Firestore and load them to the collections.
                        setProvincesLoaded(false);
                        let provinces = [];    
                        provinces = await getAllProvinces();
                        provinces = provinces.map(doc=> ({...doc}));
                        addCollection(PROVINCES, provinces, 1, false, ...placeSortFields); // false - not a primitive type.
            
                        // For the municipalities, main places and sub-places, load the empty arrays to the collections.
                        addCollection(MUNICIPALITIES, [], 1, false, ...placeSortFields);
                        addCollection(MAIN_PLACES, [], 1, false, ...placeSortFields);
                        addCollection(SUB_PLACES, [], 1, false, ...placeSortFields);
                        
                    } catch (error) {
                        toast.error(error, toastifyTheme);
                    } finally {
                        setPropertyTypesKey(propertyTypesKey + keyStep); // Cause propertyTypes dropdown to re-render with its new data.                                    
                        setProvincesLoaded(true);
                    } // finally
                } // if (!collectionExists(TRANSACTION_TYPES)) {
                if (location.pathname === `/my-profile/listings/${params.listingId}/edit`) {
                    retrieveListingInfo();
                }
            } // if (firstRender.current === true) {
        })();
    }, []);
    
    async function retrieveListingInfo() {
        // Get the listing and populate the form.
        if (varExists('clickedListing')) {
            let clickedListing = getVar('clickedListing');
            clickedListing = deepClone(clickedListing);

            setLoadingMessage('Loading the listing ...');
            // Perform some minor transformation to get the listing form-ready.
            const data = deepClone({...init, ...clickedListing}); // Optional fields which are not available will created and assigned empty strings.

            // Optional address fields which are not available will be created and assigned empty strings.
            data.address = deepClone({...init.address, ...clickedListing.address});

            // Remove the fields that are not needed here (in this component).
            delete data.address['provinceName'];
            delete data.address['municipalityName'];
            delete data.address['mainPlaceName'];
            delete data.address['subPlaceName'];
            delete data['currentPrice'];
            
            data.priceInfo = deepClone(init.priceInfo);
            data.priceInfo.regularPrice = clickedListing.priceInfo.regularPrice;

            if ('offer' in clickedListing.priceInfo) {
                data.priceInfo.offer = clickedListing.priceInfo.offer;
                // The deep cloning of clickedListing has converted the expiryDate field to an ISO timestamp string.
                data.priceInfo.offer.expiryDate = timeStampYyyyMmDd(new Date(clickedListing.priceInfo.offer.expiryDate));
            }
            else
                data.priceInfo.offer = deepClone(init.priceInfo.offer); // Filling in empty fields where offer is not available.

            if ('rates' in clickedListing) {
                // Check for rate types that are not present in clickedListing, and fill with blanks.
                if (!('utilityRates' in clickedListing.rates))
                    data.rates.utilityRates = deepClone(init.rates.utilityRates);
                if (!('propertyTax' in clickedListing.rates))
                    data.rates.propertyTax = deepClone(init.rates.utilityRates);
                if (!('associationFees' in clickedListing.rates))
                    data.rates.associationFees = deepClone(init.rates.associationFees);
            } // if ('rates' in clickedListing) {
            // else data.rates has been set with all the blank rates from init object.

            setFormData(data);
            listingUniqueId.current = data.listingId;
            delete data['listingId']; // No longer needed from this point on.

            // Set the respective drop-downs

            // Set the selected transaction type and property type.
            setSelected(TRANSACTION_TYPES, [data.transactionType]);
            setSelected(PROPERTY_TYPES, [data.propertyType]);

            const provinces = getCollectionData(PROVINCES);
            let province = provinces.find(doc=> {
                return doc.code === data.address.provincialCode;
            });
            if (province !== undefined) {
                setSelected(PROVINCES, [province]); // Set the selected province in the dropdown.
            } // if (province !== undefined) {

            // Update the municipalities collection with municipalities of the selected province
            let municipalities = await getMunicipalitiesPerProvince(data.address.provincialCode);
            updateCollection(MUNICIPALITIES, municipalities);
            let municipality = municipalities.find(doc=> {
                return doc.code === data.address.municipalityCode;
            });
            if (municipality !== undefined) {
                setSelected(MUNICIPALITIES, [municipality]); // Set selected municipality.
            } // if (municipality !== undefined) {

            // Get the main places of the selected municipality and update the main place collection.
            let mainPlaces = await getMainPlacesPerMunicipality(data.address.provincialCode, data.address.municipalityCode);
            updateCollection(MAIN_PLACES, mainPlaces);
            let mainPlace = mainPlaces.find(doc=> {
                return doc.code === data.address.mainPlaceCode;
            });
            if (mainPlace !== undefined) {
                setSelected(MAIN_PLACES, [mainPlace]);                
            } // if (mainPlace !== undefined) {
            
            // Get the sub-places of the selected main place and update the sub-places collection.
            let subPlaces = await getSubPlacesPerMainPlace(data.address.provincialCode, data.address.municipalityCode,
                                                            data.address.mainPlaceCode);
            updateCollection(SUB_PLACES, subPlaces);
            let subPlace = subPlaces.find(doc=> {
                return doc.code === data.address.subPlaceCode;
            });
            if (subPlace !== undefined) {
                setSelected(SUB_PLACES, [subPlace]);              
            }
            
            setLoadingMessage(null);
            setTransactionTypesKey(transactionTypesKey + keyStep);
            setPropertyTypesKey(propertyTypesKey + keyStep);
            setProvincesKey(provincesKey + keyStep);
            setMunicipalitiesKey(municipalitiesKey + keyStep);
            setMainPlacesKey(mainPlacesKey + keyStep);
            setSubPlacesKey(subPlacesKey + keyStep);
            setUpdateMode(true); // Setting up the form to enable edtiting of data.

        } // if (varExists('clickedListing') && varExists(LISTINGS)) {
    } // function retrieveListingInfo() {

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
                        <label htmlFor='title'>* Title</label>
                        <input name='title' autoComplete='off' disabled={isNotEditable('title')} required={true} maxLength={50} minLength={10} aria-required={true}
                                className='w3-input w3-input-theme-1' type='text' aria-label='Title' onChange={e=> handleChange(e)} value={formData.title} />
                        {getEditIcon('title')}
                        {showErrorIcon('title')}
                    </div>
                    
                    <div className='w3-margin-top'>
                        <Dropdown label='* Transaction Type' key={transactionTypesKey} isDisabled={isNotEditable('transactionType')} collectionName={TRANSACTION_TYPES} selectedValue={formData.transactionType} 
                                            onItemSelected={transactionTypeSelected} />
                        {getEditIcon('transactionType')}
                        {showErrorIcon('transactionType')}
                    </div>
                    
                    <div className='w3-margin-top'>
                        <Dropdown key={propertyTypesKey} label='* Property Type' isDisabled={isNotEditable('propertyType')} collectionName={PROPERTY_TYPES} selectedValue={formData.propertyType} 
                                onItemSelected={propertyTypeSelected} />
                        {getEditIcon('propertyType')}
                        {showErrorIcon('propertyType')}
                    </div>
        
                    <div className='w3-padding-top-24'>
                        <h4>Price Info</h4>
                        <div>
                            <div className='w3-padding-small'>
                                <label htmlFor='priceInfo-regularPrice'>* Price (R)</label>
                                <input name='priceInfo-regularPrice' autoComplete='off' disabled={isNotEditable('priceInfo.regularPrice')} className='w3-input w3-input-theme-1' type='number' 
                                        aria-label='Price' required={true} aria-required={true} onChange={e=> handleChange(e)} value={formData.priceInfo.regularPrice}  />
                                {getEditIcon('priceInfo.regularPrice')}
                                {showErrorIcon('priceInfo.regularPrice')}
                            </div>
        
                            <div>
                                <h5>Offer (Optional)</h5>
                                <div>
                                    <div className='w3-padding-small side-by-side'>
                                        <label htmlFor='priceInfo-offer-discountedPrice'>Discounted Price (R)</label>
                                        <input name='priceInfo-offer-discountedPrice' autoComplete='off' disabled={isNotEditable('priceInfo.offer.discountedPrice')} className='w3-input w3-input-theme-1'
                                                type='number' aria-label='Discounted Price' onChange={e=> handleChange(e)} value={formData.priceInfo.offer.discountedPrice} />
                                        {getEditIcon('priceInfo.offer.discountedPrice')}
                                        {showErrorIcon('priceInfo.offer.discountedPrice')}
                                    </div>
                                    
                                    <div className='w3-padding-small side-by-side'>
                                        <label htmlFor='priceInfo-offer-appliesFor'>Applies For (month/months)</label>
                                        <input name='priceInfo-offer-appliesFor' autoComplete='off' disabled={isNotEditable('priceInfo.offer.appliesFor')} className='w3-input w3-input-theme-1' type='number' 
                                                aria-label='Applies For' onChange={e=> handleChange(e)} value={formData.priceInfo.offer.appliesFor} />
                                        {getEditIcon('priceInfo.offer.appliesFor')}
                                        {showErrorIcon('priceInfo.offer.appliesFor')}
                                    </div>
                                    
                                    <div className='w3-padding-small side-by-side'>
                                        <label htmlFor='priceInfo-offer-expiryDate'>Offer expires on</label>
                                        <input name='priceInfo-offer-expiryDate' autoComplete='off' disabled={isNotEditable('priceInfo.offer.expiryDate')} className='w3-input w3-input-theme-1' type='date' 
                                                aria-label='Expiry Date' onChange={e=> handleChange(e)} value={formData.priceInfo.offer.expiryDate} />
                                        {getEditIcon('priceInfo.offer.expiryDate')}
                                        {showErrorIcon('priceInfo.offer.expiryDate')}
                                    </div>
                                </div>       
                            </div>
                        </div>  
                    </div>
        
                    <div className='w3-padding-small padding-top-16'>
                        <label htmlFor='description'>* Description</label>
                        <textarea  name='description' autoComplete='off' disabled={isNotEditable('description')}  required={true} aria-required={true} maxLength={250} minLength={50} className='w3-input w3-input-theme-1' type='text'
                                aria-label='Description' onChange={e=> handleChange(e)} value={formData.description} />
                        {getEditIcon('description')}
                        {showErrorIcon('description')}
                    </div>
                                
                    <div className='w3-padding-small'>
                        <label htmlFor='numBedrooms'>* Number of bedrooms</label>
                        <input name='numBedrooms' autoComplete='off' disabled={isNotEditable('numBedrooms')}  required={true} aria-required={true} className='w3-input w3-input-theme-1' type='number' 
                                aria-label='Number of bedrooms'  onChange={e=> handleChange(e)} value={formData.numBedrooms} min={0} max={8} step={1}/>
                        {getEditIcon('numBedrooms')}
                        {showErrorIcon('numBedrooms')}  
                    </div>                    
        
                    <div className='w3-padding-small'>
                        <label htmlFor='numBathrooms'>* Number of bathrooms</label>
                        <input name='numBathrooms' autoComplete='off' disabled={isNotEditable('numBathrooms')}  required={true} aria-required={true} className='w3-input w3-input-theme-1' type='number' 
                                aria-label='Number of bathrooms'  onChange={e=> handleChange(e)} value={formData.numBathrooms} min={0} max={8} step={1} />
                        {getEditIcon('numBathrooms')}
                        {showErrorIcon('numBathrooms')}  
                    </div> 
        
                    <div className='w3-padding-small'>
                        <label htmlFor='parkingCapacity'>* Parking Capacity</label>
                        <input name='parkingCapacity' autoComplete='off'  disabled={isNotEditable('parkingCapacity')} required={true} aria-required={true} className='w3-input w3-input-theme-1' type='number' 
                                aria-label='Parking Capacity' onChange={e=> handleChange(e)} value={formData.parkingCapacity} min={0} max={8} />
                        {getEditIcon('parkingCapacity')}
                        {showErrorIcon('parkingCapacity')}                
                    </div>
        
                    <div className='w3-padding-small'>
                        <label htmlFor='garageCapacity'>Garage Capacity (Optional)</label>
                        <input name='garageCapacity' autoComplete='off'  disabled={isNotEditable('garageCapacity')} className='w3-input w3-input-theme-1' type='number' 
                                aria-label='Parking Capacity' onChange={e=> handleChange(e)} value={formData.garageCapacity} min={0} max={8} />
                        {getEditIcon('garageCapacity')}
                        {showErrorIcon('garageCapacity')}                
                    </div>
        
                    <div className='w3-padding-small'>
                        <label htmlFor='totalFloorArea'>* Total Floor Area m<sup>2</sup></label>
                        <input name='totalFloorArea' autoComplete='off'  disabled={isNotEditable('totalFloorArea')} className='w3-input w3-input-theme-1' type='number' 
                                aria-label='Total Floor Area' onChange={e=> handleChange(e)} value={formData.totalFloorArea} min={0} />
                        {getEditIcon('totalFloorArea')}
                        {showErrorIcon('totalFloorArea')}                
                    </div>
        
                    <div className='w3-padding-small'>
                        <label htmlFor='erfSize'>Erf Size (Optional) m<sup>2</sup></label>
                        <input name='erfSize' autoComplete='off' disabled={isNotEditable('erfSize')} className='w3-input w3-input-theme-1' type='number' 
                                aria-label='Erf Size (Optional)' onChange={e=> handleChange(e)} value={formData.erfSize} min={0} />
                        {getEditIcon('erfSize')}
                        {showErrorIcon('erfSize')}
                    </div>
        
                    <div className=''>
                        <h4>Rates (Optional)</h4>
                        <div className=''>
                            <div className='w3-padding-small side-by-side'>
                                <label htmlFor='rates-utilityRates-amount'>Municipal Utilities (R)</label>
                                <input name='rates-utilityRates-amount' autoComplete='off' disabled={isNotEditable('rates.utilityRates.amount')} className='w3-input w3-input-theme-1'
                                        type='number' aria-label='Municipal Utility Amount' onChange={e=> handleChange(e)} value={formData.rates.utilityRates.amount} />
                                {getEditIcon('rates.utilityRates.amount')}
                                {showErrorIcon('rates.utilityRates.amount')}
                            </div>
                            
                            <div className='w3-padding-small side-by-side'>
                                <label htmlFor='rates-utilityRates-frequency'>Billed Every (month/months)</label>
                                <input name='rates-utilityRates-frequency' autoComplete='off' disabled={isNotEditable('rates.utilityRates.frequency')} className='w3-input w3-input-theme-1'
                                        type='number' aria-label='Municipal Utility Billing Frequency' onChange={e=> handleChange(e)} value={formData.rates.utilityRates.frequency} />
                                {getEditIcon('rates.utilityRates.frequency')}
                                {showErrorIcon('rates.utilityRates.frequency')}
                            </div>
                        </div>
                        
                        <div className=''>
                            <div className='w3-padding-small side-by-side'>
                                <label htmlFor='rates-propertyTax-amount'>Property Tax (R)</label>
                                <input name='rates-propertyTax-amount' autoComplete='off' disabled={isNotEditable('rates.propertyTax.amount')} className='w3-input w3-input-theme-1'
                                        type='number' aria-label='Property Tax' onChange={e=> handleChange(e)} value={formData.rates.propertyTax.amount} />
                                {getEditIcon('rates.propertyTax.amount')}
                                {showErrorIcon('rates.propertyTax.amount')}
                            </div>
                            
                            <div className='w3-padding-small side-by-side'>
                                <label htmlFor='rates-propertyTax-frequency'>Billed Every (month/months)</label>
                                <input name='rates-propertyTax-frequency' autoComplete='off' disabled={isNotEditable('rates.propertyTax.frequency')} className='w3-input w3-input-theme-1'
                                        type='number' aria-label='Property Tax Billing Frequency' onChange={e=> handleChange(e)} value={formData.rates.propertyTax.frequency} />
                                {getEditIcon('rates.propertyTax.frequency')}
                                {showErrorIcon('rates.propertyTax.frequency')}
                            </div>
                        </div>
                        
                        <div className=''>
                            <div className='w3-padding-small side-by-side'>
                                <label htmlFor='rates-associationFees-amount'>Association Fees (R)</label>
                                <input name='rates-associationFees-amount' autoComplete='off' disabled={isNotEditable('rates.associationFees.amount')} className='w3-input w3-input-theme-1'
                                        type='number' aria-label='Association Fees' onChange={e=> handleChange(e)} value={formData.rates.associationFees.amount} />
                                {getEditIcon('rates.associationFees.amount')}
                                {showErrorIcon('rates.associationFees.amount')}
                            </div>
                            
                            <div className='w3-padding-small side-by-side'>
                                <label htmlFor='rates-associationFees-frequency'>Billed Every (month/months)</label>
                                <input name='rates-associationFees-frequency' autoComplete='off' disabled={isNotEditable('rates.associationFees.frequency')} className='w3-input w3-input-theme-1'
                                        type='number' aria-label='Association Fees Billing Frequency' onChange={e=> handleChange(e)} value={formData.rates.associationFees.frequency} />
                                {getEditIcon('rates.associationFees.frequency')}
                                {showErrorIcon('rates.associationFees.frequency')}
                            </div>
                        </div>
                    </div>
                    
                    <div className=''>
                        <h4>Address</h4>  
                        <div className='w3-padding-small'>
                            <label htmlFor='address-complexName'>Buiding or Complex Name (Optional)</label>
                            <input name='address-complexName' autoComplete='off' disabled={isNotEditable('address.complexName')} maxLength={50}  minLength={2} className='w3-input w3-input-theme-1' type='text' 
                                    aria-label='Building or Complex Name (Optional)' onChange={e=> handleChange(e)} value={formData.address.complexName}  />
                            {getEditIcon('address.complexName')}
                            {showErrorIcon('address.complexName')}
                        </div>
        
                        <div className='w3-padding-small'>
                            <label htmlFor='address-unitNo'>Unit No. (Optional)</label>
                            <input name='address-unitNo' autoComplete='off' disabled={isNotEditable('address.unitNo')} maxLength={25} className='w3-input w3-input-theme-1' type='text' 
                                    aria-label='Unit Number (Optional)' onChange={e=> handleChange(e)} value={formData.address.unitNo} />
                            {getEditIcon('address.unitNo')}
                            {showErrorIcon('address.unitNo')}
                        </div>
        
                        <div className='w3-padding-small'>
                            <label htmlFor='address-streetNo'>* Street No.</label>
                            <input name='address-streetNo' autoComplete='off' disabled={isNotEditable('address.streetNo')} required={true} aria-required={true} maxLength={10}
                                    className='w3-input w3-input-theme-1' type='text' aria-label='Street Number'
                                    onChange={e=> handleChange(e)} value={formData.address.streetNo} />
                            {getEditIcon('address.streetNo')}
                            {showErrorIcon('address.streetNo')}
                        </div>
                    
                        <div className='w3-padding-small'>
                            <label htmlFor='address-streetName'>Street Name (Optional)</label>
                            <input name='address-streetName' autoComplete='off' disabled={isNotEditable('address.streetName')} maxLength={50} minLength={2} 
                                    className='w3-input w3-input-theme-1' type='text' aria-label='Street Name (Optional)' onChange={e=> handleChange(e)}
                                    value={formData.address.streetName} />
                            {getEditIcon('address.streetName')}
                            {showErrorIcon('address.streetName')}
                        </div>
        
                        {provincesLoaded?
                            <>
                                <div className='w3-padding-small'>
                                    <Dropdown2 label='* Province' collectionName={PROVINCES} keyName='name' valueName='code' onItemSelected={provinceSelected} 
                                                selectedValue={formData.address.provincialCode} isDisabled={isNotEditable('address.provincialCode')}/>
                                    {getEditIcon('address.provincialCode')}
                                    {showErrorIcon('address.provincialCode')}
                                </div>
                            </>
                            :
                            <Loader message='Loading provinces ...' small={true} />
                        }
        
                        {municipalitiesLoaded?
                            <div className='w3-padding-small'>
                                <Dropdown2 key={municipalitiesKey} label='* Municipality' collectionName={MUNICIPALITIES} keyName='name' valueName='code' onItemSelected={municipalitySelected} 
                                                    selectedValue={formData.address.municipalityCode} isDisabled={isNotEditable('address.municipalityCode')}/>
                                {getEditIcon('address.municipalityCode')}
                                {showErrorIcon('address.municipalityCode')}
                            </div>
                            :
                            <Loader message='Loading municipalities ...' small={true}/>
                        }
        
                        {mainPlacesLoaded?
                            <div className='w3-padding-small'>
                                <Dropdown2 key={mainPlacesKey} label='* Main Place' collectionName={MAIN_PLACES} keyName='name' valueName='code' onItemSelected={mainPlaceSelected} 
                                                    selectedValue={formData.address.mainPlaceCode} isDisabled={isNotEditable('address.mainPlaceCode')}/>
                                {getEditIcon('address.mainPlaceCode')}
                                {showErrorIcon('address.mainPlaceCode')}
                            </div>
                            :
                            <Loader message='Loading main places ...' small={true}/>
                        }
        
                        {subPlacesLoaded?
                            <div className='w3-padding-small'>
                                <Dropdown2 key={subPlacesKey} label='* Sub Place' collectionName={SUB_PLACES} keyName='name' valueName='code' onItemSelected={selectSubPlaceCode} 
                                                    selectedValue={formData.address.subPlaceCode} isDisabled={isNotEditable('address.subPlaceCode')}/>
                                {getEditIcon('address.subPlaceCode')}
                                {showErrorIcon('address.subPlaceCode')}
                            </div>
                            :
                            <Loader message='Loading sub-places ...' small={true}/>
                        }
                    </div>
        
        
                    <div className=''>
                        <h4>Map Coordinates</h4>
                        <div>
                            <div className='w3-padding-small side-by-side'>
                                <label htmlFor='mapCoordinates-latitude'>* Latitude</label>
                                <input name='mapCoordinates-latitude' autoComplete='off' disabled={isNotEditable('mapCoordinates.latitude')} className='w3-input w3-input-theme-1' type='number' 
                                        aria-label='Latitude' onChange={e=> handleChange(e)} value={formData.mapCoordinates.latitude}  />
                                {getEditIcon('mapCoordinates.latitude')}
                                {showErrorIcon('mapCoordinates.latitude')}
                            </div>
        
                            <div className='w3-padding-small side-by-side'>
                                <label htmlFor='longitude'>* Longitude</label>
                                <input name='mapCoordinates-longitude' autoComplete='off' disabled={isNotEditable('mapCoordinates.longitude')} maxLength={50} minLength={2} className='w3-input w3-input-theme-1' type='number' 
                                        aria-label='Longitude' onChange={e=> handleChange(e)} value={formData.mapCoordinates.longitude} />
                                {getEditIcon('mapCoordinates.longitude')}
                                {showErrorIcon('mapCoordinates.longitude')}
                            </div>
                        </div>  
                    </div>
        
                    <div>
                        {formData.images.length > 0 &&
                            <div>
                                <h4>Images</h4>
                                <div className='w3-padding-small w3-content w3-display-container'>
                                    {formData.images.map((image, index)=> {
                                            return (
                                                <img className='mySlides' 
                                                    key={index}
                                                    src={image.url} 
                                                    alt={`image${index + 1}`}
                                                    style={{width: '100%',
                                                    display: (slideIndex === index? 'block':'none')}}/>
                                            );
                                        }) // formData.images.map((imageUrl, index)=> {
                                    }                            
                                    <button className="w3-button w3-black w3-display-left" type='button' onClick={e=> goNext(-1)}>&#10094;</button>
                                    <button className="w3-button w3-black w3-display-right" type='button' onClick={e=> goNext(1)}>&#10095;</button>
                                    <input type='checkbox' name='markForDeletion' className='w3-input-theme-1' checked={formData.images[slideIndex]?.toDelete === true}
                                            onChange={e=> handleMarkedForDeletionClicked(e)} />
                                    <label htmlFor='markForDelection'> <BsTrash3/>Mark for Deletion</label>
                                </div>
                            </div>
                        } 
                        
                        {((updateMode && attachImages && formData.images.length < 6)
                            || (!updateMode)) &&
                            <div className='w3-margin-top'>
                                <h4>Attach images</h4>
                                {imagesToUpload.length > 0 &&
                                    <div className='w3-padding-small w3-margin-top'>
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
                                                    <div className='w3-input-theme-1' key={index} onClick={e=> removeImageToUpload(file)}>
                                                        <NavLink>
                                                            {file.name} : ({fileSizeMiB(file).toFixed(2)} MiB) {(fileError !== null) && <span><BiSolidError/>{fileError}</span>}<BsTrash3/>
                                                        </NavLink>
                                                    </div>
                                                );
                                            })}
                                        </>
                                    </div>
                                }
                                {showErrorIcon('imagesToUpload')}
        
                                {uploadingErrors !== null &&
                                    <div className='w3-padding-small w3-padding-top'>
                                        {
                                            uploadingErrors.map((uploadingErr, idx)=> {
                                                return (
                                                    <div key={idx} className='w3-small w3-text-black'>
                                                        <BiErrorCircle/>{uploadingErr}
                                                    </div>
                                                );
                                            })
                                        }
                                    </div>
                                }
        
                                <div className='w3-padding-small w3-margin-top'>
                                    <label htmlFor='image'>* Attach images <IoMdAttach/></label>
                                    <input name='image' multiple={true} disabled={formData.images.length >= 6} className='w3-input w3-input-theme-1'
                                            type='file' aria-label='Upload image' onChange={e=> handleChange(e)} />
                                    <div>
                                        Allowed file types {allowedFileTypes.join(' ')}. Up to 1MiB
                                    </div>
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
