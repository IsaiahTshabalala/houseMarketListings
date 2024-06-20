/**
 * File: ./src/components/AccountInfo.js
 * ----------------------------------------------------------------------------
 * Description: 
 * Used to enable the user to view, capture or update their account information.
 * Also enables the user to enrol for 2nd factor SMS authentication.
 * ----------------------------------------------------------------------------
 Date        Dev   Version  Description
 2023/11/20  ITA   1.00     Genesis.
 2024/06/16  ITA   1.01     Adjust the data from the userContext is retrieved.
 */
import { useState, useEffect, useContext, useRef } from 'react';
import { userContext } from '../hooks/UserProvider.js';
import { collectionsContext } from '../hooks/CollectionsProvider.js';
import { doc, setDoc, Timestamp, deleteField } from 'firebase/firestore';
import { db, isSignedIn } from '../config/appConfig.js';
import { getAllProvinces, getMunicipalitiesPerProvince, getMainPlacesPerMunicipality, getSubPlacesPerMainPlace,
         PROVINCES, MUNICIPALITIES, MAIN_PLACES, SUB_PLACES } from '../utilityFunctions/firestoreComms.js';
import { ToastContainer, toast } from 'react-toastify';
import { BiErrorCircle } from 'react-icons/bi';
import { BsPencilFill, BsCheck } from 'react-icons/bs';
import { MdCancel } from 'react-icons/md';
import { hasValues, timeStampYyyyMmDd, isValidShortDescription, isValidMobileNo, isValidName,
         isValidDisplayName, isValidStreetNo, deepClone } from '../utilityFunctions/commonFunctions.js';
import toastifyTheme from './toastifyTheme.js';
import '../w3.css';
import EnrolUserForSMSAuth from './EnrolUserForSMSAuth.js';
import Loader from './Loader.js';
import Dropdown2 from './Dropdown2.js';
const loDash = require('lodash');

const init = {
    displayName: '',
    firstName: '',
    surname: '',
    dateOfBirth: '',
    complexName: '',
    unitNo: '',
    streetNo: '',
    streetName: '',
    provincialCode: '',
    municipalityCode: '',
    mainPlaceCode: '',
    subPlaceCode: '',
    mobileNo: ''
};
const keyStep = 0.001;

function AccountInfo() {
    const [formData, setFormData] = useState(init);
    const [errors, setErrors] = useState({}); // Used to keep track of errors in each field.
    const [updateMode, setUpdateMode] = useState(false); /* Update mode set to true means the user had populated their account data before.
                                                            and is likely to perform an update.
                                                            Update mode set to false means the user is capturing their account data for the first time.
                                                        */

    const [editableFields, setEditableFields] = useState({}); // Used to keep track of edited fields. By keeping their previous state.
 
    // Message to be displayed while data is loading. Null when complete.
    const [loadingMessage, setLoadingMessage] = useState(null);

    const { currentUser, userDispatch } = useContext(userContext);
    const { addCollection, getCollectionData, getSelected,
            setSelected, updateCollection, collectionExists } = useContext(collectionsContext);
    const firstRender = useRef(true);

    const [provincesLoaded, setProvincesLoaded] = useState(true);
    const [municipalitiesLoaded, setMunicipalitiesLoaded] = useState(true);
    const [mainPlacesLoaded, setMainPlacesLoaded] = useState(true);
    const [subPlacesLoaded, setSubPlacesLoaded] = useState(true);

    /* The key variable below, whenever they are set, cause a re-render of the respective dropdown.
       Helpful after repopulating a collection or a selected item of a dropdown, outside of the dropdown. */    
    const [provincesKey, setProvincesKey] = useState(Math.random());
    const [municipalitiesKey, setMunicipalitiesKey] = useState(Math.random());
    const [mainPlacesKey, setMainPlacesKey] = useState(Math.random());
    const [subPlacesKey, setSubPlacesKey] = useState(Math.random());

    async function provinceSelected() {
        // Set the provincial code of the form data to that of the selected province in the provinces dropdown.
        // Also reload the municpalities dropdown with the municipalities of the currently selected province.

        try {
            let result = getSelected(PROVINCES);
            let selectedProvince = null;
            if (result.length > 0)
                selectedProvince = result[0];

            if (formData.provincialCode === selectedProvince.code) // Do not proceed if there was no real change in the selection of the municipality code.
                return;                           // This is to save the cost of unnecessary trips to Firestore.
          
            const newFormData = deepClone({...formData});
            newFormData.provincialCode = selectedProvince.code; // Set the form provincial code to that of the currently selected province.
            setFormData(newFormData);

            // Get municipalities linked to the selected province.
            setMunicipalitiesLoaded(false);
            let municipalities = [];
            municipalities = await getMunicipalitiesPerProvince(selectedProvince.code);
            municipalities = municipalities.map(doc=> ({...doc, sortField: doc.name})); // Add the sort field.

            updateCollection(MUNICIPALITIES, municipalities); 
        } catch (error) {
            toast.error(error, toastifyTheme);
        } finally {
            setMunicipalitiesKey(municipalitiesKey + keyStep);
            setMunicipalitiesLoaded(true);
            validate();
        }
    } // function async provinceSelected(code) {

    async function municipalitySelected() {
    /* Update the municipality code of the form data with that of the currently selected municipality in the 
        municipalities dropdown.
        Also reload the main places dropdown with the main places of the currently selected municipality.
    */
        try {
            let selectedMunicipality = null;
            const result = getSelected(MUNICIPALITIES); // Length 1 array expected.
            if (result.length > 0)
                selectedMunicipality = result[0];

            if (formData.municipalityCode === selectedMunicipality.code) // Do no proceed if there was no real change in the municipality code selection.
                return;
            
            const newFormData = deepClone({...formData});
            newFormData.municipalityCode = selectedMunicipality.code;
            setFormData(newFormData);

            // Obtain the main places of the selected municipality.
            setMainPlacesLoaded(false);
            let mainPlaces = [];
            mainPlaces = await getMainPlacesPerMunicipality(newFormData.provincialCode, newFormData.municipalityCode);
            mainPlaces = mainPlaces.map(doc=> ({...doc, sortField: doc.name}));  // sortField added.
            
            updateCollection(MAIN_PLACES, mainPlaces);
        } catch (error) {
            toast.error(error, toastifyTheme);            
        } finally {
            setMainPlacesKey(mainPlacesKey + keyStep);    
            setMainPlacesLoaded(true);
            validate();
        } // finally
        
    } // async function municipalitySelected(code) {

    async function mainPlaceSelected() {
        /* Update the form data with main-place code of the currently selected main place in the main places dropdown.
           Also reload the sub-places dropdown with the sub-places of the currently selected main place.
        */ 
        try {
            let selectedMainPlace = null;
            const result = getSelected(MAIN_PLACES);

            if (result.length > 0)
                selectedMainPlace = result[0];
    
            if (selectedMainPlace === null)
                return;
    
            if (formData.mainPlaceCode === selectedMainPlace.code) // Do not proceed if there was no real change in the main place selection.
                return;
    
            const newFormData = deepClone({...formData, mainPlaceCode: selectedMainPlace.code});
            setFormData(newFormData);
    
            // Get the sub-places linked to the selected main place.
            setSubPlacesLoaded(false);
            let subPlaces = [];
            // An array of sub-places of a particular main place.
            subPlaces = await getSubPlacesPerMainPlace(newFormData.provincialCode, newFormData.municipalityCode, newFormData.mainPlaceCode);
            subPlaces = subPlaces.map(doc=> ({...doc, sortField: doc.name}));  // sort field added.
            updateCollection(SUB_PLACES, subPlaces);            
        } catch (error) {
            toast.error(error, toastifyTheme);
        } finally {
            setSubPlacesKey(subPlacesKey + keyStep);
            setSubPlacesLoaded(true)
            validate();
        } // finally
    } // async function mainPlaceSelected() {

    async function subPlaceSelected() {
        // Update the sub-place code of the form data to that of the currently selected sub-place in the sub-places dropdown.
        try {
            let selectedSubPlace = null;        
            let result = getSelected(SUB_PLACES);
            if (result.length > 0)
                selectedSubPlace = result[0];
    
            if (selectedSubPlace === null)
                return;
    
            if (formData.subPlaceCode === selectedSubPlace.code) // Do not proceed if there was no real change in the sub-place code selection.
                return;
            
            const newFormData = deepClone({...formData, subPlaceCode: selectedSubPlace.code});
            setFormData(newFormData);
            
        } catch (error) {
            toast.error(error, toastifyTheme);
        } finally {            
            validate();  
        } // finally
    } // async function subPlaceSelected(code) {


    function fieldsEdited() { // Indicate whether there any fields that were edited on the form.
        return Object.keys(editableFields).length > 0;
    }

    function disableButton() {
        if (updateMode === false) // New Account data entry. Enable the Save button.
            return false;

        // else: Account data update.

        if (fieldsEdited()) // If there were any fields that were edited, enable the Save button.
            return false;

        return true;
    } // function disableButton()

    async function toggleEditable(fieldPath) { // NB. fieldPath is path to be one of editableFields object's fieldss
        /** Toggle field editability as follows:
         * If the field (path) is found in editable fields, restore its previous value to the form data 
         * and remove the field (path) from editable fields.
         * Else if a field (path) is not found in editable fields, store it in editable fields.
         * */
        if (isEditable(fieldPath)) {
            // revert to the previous field value.
            const tempFormData = deepClone(formData);
            const revertValue = loDash.get(editableFields, fieldPath, ''); // Get the field (path) value from the editableFields object
            const editValue = loDash.get(tempFormData, fieldPath, '');
            loDash.set(tempFormData, fieldPath, revertValue); // Restore it to formData
            setFormData(tempFormData);

            // Remove the field from editable fields
            const tempEditableFields = deepClone(editableFields);
            loDash.unset(tempEditableFields, fieldPath); // Remove the field (path) from editableFields object
            setEditableFields(tempEditableFields);

            // Also remove error(s) associated with the field (path)
            const tempErrors = deepClone(errors);
            loDash.unset(tempErrors, fieldPath); // Clear the errors object of the field (path)
            setErrors(tempErrors);

            // (revertValue !== editValue) is used to check if a true reversion of values has taken place.
            // So as to not reload data unnecessarily.
            if ((revertValue !== editValue) && ['provincialCode', 'municipalityCode', 'mainPlaceCode', 'subPlaceCode'].includes(fieldPath)) {
                let provinces = [],
                    municipalities = [],
                    mainPlaces = [],
                    subPlaces = [],
                    selectedProvince = null,
                    selectedMunicipality = null,
                    selectedMainPlace = null,
                    selectedSubPlace = null;
                try {
                    switch (fieldPath) {
                        case 'provincialCode': 
                        // If the provincial code was reverted then:
                            // Set the selected province to the value reverted to.
                            provinces = [];
                            provinces = getCollectionData(PROVINCES);
    
                            selectedProvince = provinces.find(province=> province.code === tempFormData.provincialCode);
                            if (selectedProvince !== undefined)
                                setSelected(PROVINCES, [selectedProvince]);
    
                            // Re-render the provinces dropdown.
                            setProvincesKey(provincesKey + keyStep);
    
                            // Re-load the municipalities in accordance with the provincial code reverted to.
                            setMunicipalitiesLoaded(false);
                            await getMunicipalitiesPerProvince(tempFormData.provincialCode)
                                    .then(result=> { // An array of municipalities of a particular province.
                                        municipalities = result.map(doc=> ({...doc, sortField: doc.name})); // Add the sort field.
                                    });
                            
                            updateCollection(MUNICIPALITIES, municipalities);
    
                            // Set the selected municipality.
                            selectedMunicipality = municipalities.find(municipality=> municipality.code === tempFormData.municipalityCode);
                            if (selectedMunicipality !== undefined)
                                setSelected(MUNICIPALITIES, [selectedMunicipality]);
    
                            setMunicipalitiesKey(municipalitiesKey + keyStep); // Re-render the municipalities dropdown.
                            setMunicipalitiesLoaded(true);
                            break;
                        case 'municipalityCode':                        
                        // If the municipalityCode was reverted, then:
                            // Set the selected municipality to the value reverted to:
                            municipalities = [];
                            municipalities = getCollectionData(MUNICIPALITIES);
    
                            selectedMunicipality = municipalities.find(municipality=> municipality.code === tempFormData.municipalityCode);
                            if (selectedMunicipality !== undefined)
                                setSelected(MUNICIPALITIES, [selectedMunicipality]);
    
                            setMunicipalitiesKey(municipalitiesKey + keyStep); // re-render the municipalities drop down.
    
                            // Re-load the main places.
                            mainPlaces = [];
                            setMainPlacesLoaded(false);
                            await getMainPlacesPerMunicipality(tempFormData.provincialCode, tempFormData.municipalityCode)
                                    .then(result=> mainPlaces = result.map(doc=> ({...doc, sortField: doc.name})));
    
                            updateCollection(MAIN_PLACES, mainPlaces);
    
                            selectedMainPlace = mainPlaces.find(mainPlace=> mainPlace.code === tempFormData.mainPlaceCode);
                            if (selectedMainPlace !== undefined)
                                setSelected(MAIN_PLACES, [selectedMainPlace]);
    
                            setMainPlacesKey(mainPlacesKey + keyStep);
                            setMainPlacesLoaded(true);
                            break;
                        case 'mainPlaceCode':                            
                        // If the main place code was reverted, then:
                            // Set the selected main place to the value that was reverted to.
                            mainPlaces = [];
                            selectedMainPlace = null;
                            mainPlaces = getCollectionData(MAIN_PLACES);

                            selectedMainPlace = mainPlaces.find(mainPlace=> mainPlace.code === tempFormData.mainPlaceCode);

                            if (selectedMainPlace !== undefined)
                                setSelected(MAIN_PLACES, [selectedMainPlace]);
                            
                            setMainPlacesKey(mainPlacesKey + keyStep); // Cause the re-render of the main places dropdown.
    
                            // Re-load the sub-places.
                            subPlaces = [];
                            setSubPlacesLoaded(false);
    
                            // Get the sub-places 
                            await getSubPlacesPerMainPlace(tempFormData.provincialCode, tempFormData.municipalityCode, tempFormData.mainPlaceCode)
                                    .then(result=> subPlaces = result.map(doc=> ({...doc, sortField: doc.name}))); // add sort field.
                                
                            updateCollection(SUB_PLACES, subPlaces);
    
                            selectedSubPlace = subPlaces.find(subPlace=> subPlace.code === tempFormData.subPlaceCode);
                            if (selectedSubPlace !== undefined)
                                setSelected(SUB_PLACES, [selectedSubPlace]);
    
                            setSubPlacesKey(subPlacesKey + keyStep);
                            setSubPlacesLoaded(true);
                            break;
                        case 'subPlaceCode':
                        // If the sub place code was reverted, then:
                            // Set the selected sub-place to the value that was reverted to:
                            subPlaces = [];
                            subPlaces = getCollectionData(SUB_PLACES);
                            selectedSubPlace = subPlaces.find(subPlace=> subPlace.code === tempFormData.subPlaceCode);
                            if (selectedSubPlace !== undefined)
                                setSelected(SUB_PLACES, [selectedSubPlace]);
                            setSubPlacesKey(subPlacesKey + keyStep);
                            break;
                    } // switch (fieldPath) {                    
                } catch (error) {
                    console.log(error);
                    toast.error('An error occurred!', toastifyTheme);
                }
            } // if ((revertValue !== editValue) && ['provincialCode', 'municipalityCode', 'mainPlaceCode'].includes(fieldPath)) {

        } // if (isEditable(fieldPath)) {
        else { // Store the current value in editable fields
            const tempEditableFields = deepClone(editableFields);
            const value = loDash.get(formData, fieldPath); // Get the field (path) from the form data
            loDash.set(tempEditableFields, fieldPath, value); // Store it in editableFields object
            setEditableFields(tempEditableFields);
        } // else
    } // async function toggleEditable(fieldPath)

    function isEditable(fieldPath) {
    // Basically check if a field is one that is in the editableFields object.
    // NB. field parameter must be one of nested fields of object editableFields.
        
        if (!updateMode) // Meaning this is a new account data capture. Return true.
            return true;

        return loDash.get(editableFields, fieldPath) !== undefined;
    } // function isEditable(fieldPath)

    function isNotEditable(fieldPath) {
        return !isEditable(fieldPath);
    } // function isNotEditable(field)

    function getEditIcon(fieldPath) {
        
        if (updateMode) {
            // Return the right html to display the edit/cancel icon.
            const icon = isEditable(fieldPath)?    // is the field path in the editableFields?
                                                    <><MdCancel/>Cancel Edit</>
                                                        : 
                                                    <><BsPencilFill/>Edit</>;
            return (
                <div className='w3-btn w3-small w3-text-black' onClick={e=> {toggleEditable(fieldPath)}}>
                    {icon}
                </div>
            );
        } // function getEditIcon(field)

        return null;
    }

    async function retrieveAccountInfo() {
    // Retrieve user data from Firestore and populate the form data.
        if (!isSignedIn()) {
            return false; // User not signed in. Do not proceed further than this.
        } // if (isSignedIn() === null)
        
        setLoadingMessage('Retrieving your account information ...');
        
        let data = deepClone({...init});
        // If the user (personalDetails) data is already there in the currentUser global state, retrieve from there,
        // to reduce trips (and related costs) Firestore.
        if ((currentUser !== null) && ('displayName' in currentUser.authCurrentUser) 
            && (currentUser.authCurrentUser.displayName !== null)) {
            data = {...data, displayName: currentUser.authCurrentUser.displayName};
        }

        try {
            if (currentUser !== null) {
                if ('personalDetails' in currentUser) {
                    data = {...data, ...currentUser.personalDetails};
                    data = {...data, ...data.address};
                    delete data['address'];
                    data.dateOfBirth = timeStampYyyyMmDd(new Date(data.dateOfBirth.toString()));
                    setFormData(data);
                    setUpdateMode(true); // Indicate that the form has been populated with data, and updates can be done by user.
                                        // Meaning the user can selectively update/edit the fields.
                } // if ('personalDetails' in currentUser)
                else {
                    setUpdateMode(false); // Meaning this is a new account info entry.
                } // else
            } // if (Object.keys(currentUser).length > 0) {
        } // try
        catch (error) {
            console.log(error);
            toast.error('Some error occurred here. Please try again.', toastifyTheme);
            return false;
        } // catch (error)
        finally {            
            setFormData(data);
            setLoadingMessage(null);
        } // finally

        try {
            // Set the values displayed by the dropdowns.
            // Set the currently selected provincial code in the Dropdown.
            let provinces = [];
            let anError = null;
            setProvincesLoaded(false);            
            
            if (collectionExists(PROVINCES))
                provinces = getCollectionData(PROVINCES);
            else {
                // At this stage, the Provinces collection had not been set. Retrieve from Firestore instead.
                provinces = (await getAllProvinces()).map(prov=> {
                    return {...prov, sortField: prov.name}; // Add sortField.
                });
            }
            
            // Load the municipalities of the user address' provincial code.
            if (data !== null) {
                // Set the selected province in the provinces collection of the collectionsContext.
                const selectedProvince = provinces.find(prov=>{
                    return prov.code === data.provincialCode;
                });
                if (selectedProvince !== undefined) {
                    setSelected(PROVINCES, [selectedProvince]);
                    setProvincesKey(provincesKey + keyStep);
                } // if (selectedProvince !== undefined) {

                let municipalities = [];  
                setMunicipalitiesLoaded(false);
                if (data.provincialCode !== '' && data.municipalityCode !== '' 
                    && data.mainPlaceCode !== '' && data.subPlaceCode !== '') {
                    municipalities = await getMunicipalitiesPerProvince(data.provincialCode);
                    municipalities = municipalities.map(doc=> ({...doc, sortField: doc.name}));
                    updateCollection(MUNICIPALITIES, municipalities);
                    // Set the currently selected municipality code in the dropdown.
                    const selectedMunicipality = municipalities.find(municipality=> {
                        return municipality.code === data.municipalityCode;
                    });
                    if (selectedMunicipality !== undefined) {
                        setSelected(MUNICIPALITIES, [selectedMunicipality]);
                    }
                    
                    // Load the main places of the user address' municipality code
                    setMainPlacesLoaded(false);
                    let mainPlaces = [];
                    mainPlaces = await getMainPlacesPerMunicipality(data.provincialCode, data.municipalityCode);
                    mainPlaces = mainPlaces.map(doc=> ({...doc, sortField: doc.name}));
        
                    updateCollection(MAIN_PLACES, mainPlaces);
        
                    // Set the currently selected main place.
                    const selectedMainPlace = mainPlaces.find(mainPlace=> mainPlace.code === data.mainPlaceCode);
                    if (selectedMainPlace !== undefined)
                        setSelected(MAIN_PLACES, [selectedMainPlace]);
        
                    // Load the sub-places of the user address' main place code
                    setSubPlacesLoaded(false);
                    let subPlaces = [];
                    subPlaces = await getSubPlacesPerMainPlace(data.provincialCode, data.municipalityCode, data.mainPlaceCode);
                    subPlaces = subPlaces.map(doc=> ({...doc, sortField: doc.name})); // add sort field.
                    updateCollection(SUB_PLACES, subPlaces);
                    
                    // Set the currently selected subPlace
                    const selectedSubPlace = subPlaces.find(subPlace=> subPlace.code === data.subPlaceCode);
                    if (selectedSubPlace !== undefined)
                        setSelected(SUB_PLACES, [selectedSubPlace]);
                } // if (data.provincialCode !== '') {            
            } // if (data !== null) {
            
        } catch (error) {
            console.log(error);
            toast.error(error, toastifyTheme);
        } finally {
            setLoadingMessage(null); // Remnove the spinner and display the loaded data.
            setProvincesKey(provincesKey + keyStep);
            setProvincesLoaded(true);
            setMunicipalitiesLoaded(true);
            setMunicipalitiesKey(municipalitiesKey + keyStep); // Cause the municipalities dropdown to re-render.
            setMainPlacesLoaded(true);
            setMainPlacesKey(mainPlacesKey + keyStep);
            setSubPlacesLoaded(true);
            setSubPlacesKey(subPlacesKey + keyStep); // Cause the sub-places dropdown to re-render.
        } // finally
    } // async function retrieveAccountInfo()
        
    function handleChange(e) {
        setFormData(deepClone({...formData, [e.target.name]: e.target.value}));
        validate();        
    } // function handleChange(e)

    function showErrorIcon(fieldPath) {
        return (
            <>
                {loDash.get(errors, fieldPath) !== undefined?
                    <div className='w3-small w3-text-black'><BiErrorCircle/>{errors[fieldPath]}</div>
                    :
                    <div className='w3-small w3-text-black' style={{opacity: '0'}}>
                        <BsCheck/>
                    </div>
                }
            </>
        );
    } //    function showErrorIcon(fieldPath)

    async function validate() {    
        const checkList = {};
        if (isValidDisplayName(formData.displayName) === false)
            checkList.displayName = 'Invalid display name!';
        if (isValidName(formData.firstName) === false)
            checkList.firstName = 'Please fill in a valid First Name!';
        
        if (isValidName(formData.surname) === false)
            checkList.surname = 'Please fill in a valid Surname!';
        
        // Date of birth must be 18 to 100 years old.
        let currDateMilliSec = new Date().getTime();
        let yearsToMilliSec = 365.25 * 24 * 60 * 60 * 1000;

        let dateDiff = currDateMilliSec - new Date(formData.dateOfBirth).getTime(); // birth date in milliseconds.
        let valid = dateDiff >= 18 * yearsToMilliSec
                    && dateDiff <= 100 * yearsToMilliSec;

        if (valid === false)
            checkList.dateOfBirth = 'Must be 18 to 100 years old!';
        
        if (formData.complexName !== '' && isValidShortDescription(formData.complexName) === false) 
            checkList.complexName = 'Please fill in a valid Complex Name!';
        
        if (formData.unitNo !== '' && isValidStreetNo(formData.unitNo) === false)
            checkList.unitNo = 'Please fill in a valid Unit No!';
        
        if (isValidStreetNo(formData.streetNo) === false)
            checkList.streetNo = 'Please fill in a valid Street No!';
        
        if (formData.streetName !== '' && isValidShortDescription(formData.streetName) === false)
            checkList.streetName = 'Please fill in a valid Street Name!';
        
        let provinces = [];
        provinces = getCollectionData(PROVINCES);
        if (provinces.findIndex(province=> {
                return formData.provincialCode === province.code;
            }) < 0)
            checkList.provincialCode = 'Please choose a valid province!';
        
        let municipalities = [];
        municipalities = getCollectionData(MUNICIPALITIES);
        if (municipalities.findIndex(municipality=> {
                    return formData.municipalityCode === municipality.code;
                }) < 0)
            checkList.municipalityCode = 'Please choose a valid municipality!';
        
        let mainPlaces = [];
        mainPlaces = getCollectionData(MAIN_PLACES);
        if (mainPlaces.findIndex(mainPlace=> {
            return formData.mainPlaceCode === mainPlace.code;
        }) < 0)
            checkList.mainPlaceCode = 'Please choose a valid main place!';
        
        let subPlaces = [];
        subPlaces = getCollectionData(SUB_PLACES);
        if (subPlaces.findIndex(subPlace=> {
            return formData.subPlaceCode === subPlace.code;
        }) < 0)
            checkList.subPlaceCode = 'Please choose a valid sub-place !';
        
        if (isValidMobileNo(formData.mobileNo) === false)
            checkList.mobileNo = 'Please fill in a valid Mobile Number!';

        setErrors(checkList);
        return (!hasValues(checkList)); // true if there were no errors, false if there were errors.
    } // function validate()

    async function submitData(e) {
        e.preventDefault();

        if (!(await validate())) {
            toast.error('Some errors occurred. Please check your input, and try again!', toastifyTheme);
            return;
        } // if (!validate())

        setLoadingMessage('Updating your account information. Please wait...');

        // userDoc = {
        //        personalDetails: {
        //            firstName: 'Jack',
        //            surname: 'Stober',
        //            dateOfBirth: 1984/01/18,
        //            mobileNo: 123456781,
        //            email: 'someone@somewhere.co.za',
        //            address: {
        //                complexName: 'Tamboti',
        //                unitNo: '12A',
        //                streetNo: '25A',
        //                streetName: 'Zondo Street',
        //                provincialCode: 'ZA-GP',
        //                municipalityCode: 'LtE_GT421',
        //                mainPlaceCode: '2DE_72001',
        //                subPlaceCode: 'f2D_72001001'
        //            }
        //        },
        //        flagged: false
        // }
        
        const {displayName, firstName, surname, dateOfBirth, mobileNo,
                    complexName, unitNo, streetNo, streetName,
                    provincialCode, municipalityCode, mainPlaceCode, subPlaceCode} = formData;
        const email = currentUser.authCurrentUser.email;
        
        let data = {
            personalDetails: {
                displayName,
                firstName,
                surname, 
                // Convert the dateOfBirth first to a date type, then a Firestore Timestamp type.
                dateOfBirth: Timestamp.fromDate(new Date(dateOfBirth)),
                mobileNo,
                email,
                address: {
                    streetNo,
                    provincialCode,
                    municipalityCode,
                    mainPlaceCode,
                    subPlaceCode
                } // address
            }, // personalDetails
            flagged: false
        } // const data

        // Adding optional fields complexName and unitNo
        if (complexName !== '')    // If updated address information has a complex name.
            data.personalDetails.address.complexName = complexName;

        // Else if updated address information has no complex name:
        else if (editableFields.complexName !== undefined 
                        && editableFields.complexName !== '') // Previously there was a complex name, and was removed in the address update.
            data.personalDetails.address.complexName = deleteField(); // Instruct Firestore to remove this field during update.

        if (unitNo !== '')
            data.personalDetails.address.unitNo = unitNo;
        else if (editableFields.unitNo !== undefined
                        && editableFields.unitNo !== '') // Previously there was a unit no., and was removed in the update
            data.personalDetails.address.unitNo = deleteField(); // Instruct Firestore to remove this field during the update.

        if (streetName !== '')
            data.personalDetails.address.streetName = streetName;
        else if (editableFields.streetName !== undefined && editableFields.streetName !== '')
            data.personalDetails.streetName = deleteField();
        
        let errorFound = false;
        const docRef = doc(db, '/users', currentUser.authCurrentUser.uid);
        await setDoc(docRef, data, {merge: true})
              .then(result=> {
                    userDispatch(
                        {
                            type: 'SET_PERSONAL_DETAILS',
                            payload: {
                                ...data.personalDetails, dateOfBirth: new Date(dateOfBirth)
                            }
                        }
                    );
                    setEditableFields({});
                    setUpdateMode(true);                    
                })
              .catch(error=> {
                    toast.error(error + '. Please try again or contact Support.', toastifyTheme);
                    errorFound = true;
                });

        setProvincesKey(provincesKey + keyStep);
        setMunicipalitiesKey(municipalitiesKey + keyStep);
        setMainPlacesKey(mainPlacesKey + keyStep);
        setSubPlacesKey(subPlacesKey + keyStep);
                
        setLoadingMessage(null);

        if (errorFound === false)
            toast.success('Account Personal Details updated!', toastifyTheme);
    } // async function submitData(e)

    function revert() {
        // Enable the user to cancel any edits that were done to the form prior to submitting an update.
        const data = deepClone({...formData});
        for (const key in editableFields) {
            loDash.set(data, key, editableFields[key]);
        } // for (const key in editableFields)
        setFormData(data);
        setEditableFields({});
    }

    useEffect(() => {        
        (async ()=> {
            if (currentUser  === null)
                return;

            if (firstRender.current === false)
                return;

            firstRender.current = false;
            try {
                let provinces = [];
                setProvincesLoaded(false);

                if (!collectionExists(PROVINCES)) {
                    provinces = await getAllProvinces();
                    provinces = provinces.map(province=> ({...province, sortField: province.name}));
                    addCollection(PROVINCES, provinces, 1); // 1 - only item can be selected.

                    /* Municipalities initialised as empty. To be re-loaded per selected province, when user selects the province */
                    addCollection(MUNICIPALITIES, [], 1);

                    /* Main places initialised as empty. To be re-loaded per selected municipality. */
                    addCollection(MAIN_PLACES, [], 1);

                    /* Sub-places initialised as empty. To be re-loaded per selected main place. */
                    addCollection(SUB_PLACES, [], 1);
                }
            } catch(error) {
                toast.error(error, toastifyTheme);
            } finally {
                setProvincesLoaded(true);
            } // finally {
        })();

        retrieveAccountInfo();
    }, [currentUser]); // useEffect()

    if (loadingMessage !== null)
        return (
            <Loader message={loadingMessage}/>
        );

    return (
            <div className='w3-container'>
                <form onSubmit={submitData}> 
                    <h1>Account Personal Details</h1>
                    <div className='w3-padding-small'>
                        <label htmlFor='displayName'>* Display Name</label>
                        <input name='displayName' id='displayName' auto-complete='off' disabled={isNotEditable('displayName')} required={true} maxLength={50} minLength={2} aria-required={true} className='w3-input w3-input-theme-1' type='text'
                               aria-label='Display Name' onChange={e=> handleChange(e)} value={formData.displayName} />
                        {getEditIcon('displayName')}
                        {showErrorIcon('displayName')}
                    </div>

                    <div className='w3-padding-small'>
                        <label htmlFor='firstName'>* First Name</label>
                        <input name='firstName' id='firstName'    auto-complete='off' disabled={isNotEditable('firstName')}    required={true} aria-required={true} maxLength={50} minLength={2} className='w3-input w3-input-theme-1' type='text'
                               aria-label='First Name' onChange={e=> handleChange(e)} value={formData.firstName} />
                        {getEditIcon('firstName')}
                        {showErrorIcon('firstName')}
                    </div>
                    
                    <div className='w3-padding-small'>
                        <label htmlFor='surname'>* Surname</label>
                        <input name='surname' id='surname'    auto-complete='off' disabled={isNotEditable('surname')} required={true} aria-required={true} maxLength={50} minLength={2} className='w3-input w3-input-theme-1' type='text'
                               aria-label='Surname' onChange={e=> handleChange(e)} value={formData.surname} />
                        {getEditIcon('surname')}
                        {showErrorIcon('surname')}
                    </div>
                    
                    <div className='w3-padding-small'>
                        <label htmlFor='dateOfBirth'>* Date of Birth</label>
                        <input name='dateOfBirth' id='dateOfBirth'    auto-complete='off' disabled={isNotEditable('dateOfBirth')}    required={true} aria-required={true} className='w3-input w3-input-theme-1' type='date' 
                               aria-label='Date of Birth'    onChange={e=> handleChange(e)} value={formData.dateOfBirth} />
                        {getEditIcon('dateOfBirth')}
                        {showErrorIcon('dateOfBirth')}    
                    </div>                                        

                    <div className='w3-padding-small w3-padding-top-24'>
                        <label htmlFor='mobileNo'>* Mobile No.</label>
                        <input name='mobileNo' id='mobileNo'    auto-complete='off' disabled={isNotEditable('mobileNo')} required={true} aria-required={true} maxLength={15} className='w3-input w3-input-theme-1' type='tel' 
                               aria-label='Mobile Number' onChange={e=> handleChange(e)} value={formData.mobileNo} />
                        {getEditIcon('mobileNo')}
                        {showErrorIcon('mobileNo')}
                    </div>

                    <div className='w3-padding-top-24'>
                        <h4>Address</h4>    
                        <div className='w3-padding-small'>
                            <label htmlFor='complexName'>Buiding or Complex Name (Optional)</label>
                            <input name='complexName' auto-complete='off' disabled={isNotEditable('complexName')} maxLength={50}    minLength={2} className='w3-input w3-input-theme-1' type='text' 
                                   aria-label='Building or Complex Name (Optional)' onChange={e=> handleChange(e)} value={formData.complexName}    />
                            {getEditIcon('complexName')}
                            {showErrorIcon('complexName')}
                        </div>

                        <div className='w3-padding-small'>
                            <label htmlFor='unitNo'>Unit No. (Optional)</label>
                            <input name='unitNo' auto-complete='off' disabled={isNotEditable('unitNo')} maxLength={25} className='w3-input w3-input-theme-1' type='text' 
                                   aria-label='Unit Number (Optional)' onChange={e=> handleChange(e)} value={formData.unitNo} />
                            {getEditIcon('unitNo')}
                            {showErrorIcon('unitNo')}
                        </div>

                        <div className='w3-padding-small'>
                            <label htmlFor='streetNo'>* Street No.</label>
                            <input name='streetNo' auto-complete='off' disabled={isNotEditable('streetNo')} required={true} aria-required={true} maxLength={10} autoComplete='off'
                                   className='w3-input w3-input-theme-1' type='text' aria-label='Street Number'
                                   onChange={e=> handleChange(e)} value={formData.streetNo} />
                            {getEditIcon('streetNo')}
                            {showErrorIcon('streetNo')}
                        </div>
                
                        <div className='w3-padding-small'>
                            <label htmlFor='streetName'>Street Name (Optional)</label>
                            <input name='streetName' auto-complete='off' disabled={isNotEditable('streetName')} maxLength={50} minLength={2} 
                                   className='w3-input w3-input-theme-1' type='text' aria-label='Street Name (Optional)' onChange={e=> handleChange(e)}
                                   value={formData.streetName} />
                            {getEditIcon('streetName')}
                            {showErrorIcon('streetName')}
                        </div>
                        
                        {provincesLoaded?
                            <>
                                <div className='w3-padding-small'>
                                    <Dropdown2 key={provincesKey} label='* Province' isDisabled={isNotEditable('provincialCode')} keyName='name' valueName='code' 
                                               collectionName={PROVINCES} selectedValue={formData.provincialCode} onItemSelected={provinceSelected} />                         
                                    {getEditIcon('provincialCode')}
                                    {showErrorIcon('provincialCode')}
                                </div>
                            </>
                            :
                            <Loader message='Loading provinces ...' small={true}/>
                        }

                        {municipalitiesLoaded?
                            <div className='w3-padding-small'>
                                <Dropdown2 key={municipalitiesKey} label='* Municipality' isDisabled={isNotEditable('municipalityCode')} keyName='name' valueName='code' 
                                           collectionName={MUNICIPALITIES} selectedValue={formData.municipalityCode} onItemSelected={municipalitySelected} />                         
                                {getEditIcon('municipalityCode')}
                                {showErrorIcon('municipalityCode')}
                            </div>
                            :
                            <Loader message='Loading municipalities ...' small={true} />
                        }
                        
                        {mainPlacesLoaded?                            
                            <div className='w3-padding-small'>
                                <Dropdown2 key={mainPlacesKey} label='* Main Place' isDisabled={isNotEditable('mainPlaceCode')} keyName='name' valueName='code' 
                                           collectionName={MAIN_PLACES} selectedValue={formData.mainPlaceCode} onItemSelected={mainPlaceSelected} />                         
                                {getEditIcon('mainPlaceCode')}
                                {showErrorIcon('mainPlaceCode')}
                            </div>
                            :
                            <Loader message='Loading main places ...' small={true}/>
                        }

                        {subPlacesLoaded?
                            <div className='w3-padding-small'>
                                <Dropdown2 key={subPlacesKey} label='* Sub Place' isDisabled={isNotEditable('subPlaceCode')} keyName='name' valueName='code' 
                                           collectionName={SUB_PLACES} selectedValue={formData.subPlaceCode} onItemSelected={subPlaceSelected} />                         
                                {getEditIcon('subPlaceCode')}
                                {showErrorIcon('subPlaceCode')}
                            </div>
                            :
                            <Loader message='Loading sub-places ...' small={true} />
                        }
                    </div>
                                                            
                    <ToastContainer/>
                    
                    {updateMode && 
                        <EnrolUserForSMSAuth phoneNumber={formData.mobileNo} displayName={formData.displayName}/>
                    }
                                        
                    <div className='w3-padding'>
                        <button className='w3-btn w3-margin-small w3-theme-d5 w3-round' title='Save' disabled={disableButton()} type='submit'>Save</button>
                    </div>
                                        
                    <div className='w3-padding'>
                        <button className='w3-btn w3-margin-small w3-theme-d5 w3-round' title='Cancel' disabled={disableButton()} 
                                        onClick={e=> revert()} type='button'>Cancel</button>
                    </div>
                </form>
            </div>
    );
}

export default AccountInfo;
