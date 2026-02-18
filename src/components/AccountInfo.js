/**
 * File: ./src/components/AccountInfo.js
 * ============================================================================
 * Description: 
 * Used to enable the user to view, capture or update their account information.
 * Also enables the user to enrol for 2nd factor SMS authentication.
 * ============================================================================
 * Start Date  End Date       Dev   Version  Description
 * 2023/11/20                 ITA   1.00     Genesis.
 * 2024/06/16                 ITA   1.01     Adjust the data from the userContext is retrieved.
 * 2024/07/07                 ITA   1.02     The CollectionsProvider uses an improved mechanism for sorting data. Eliminate the use of the sortFields and
 *                                           instead use the place names for sorting.
 * 2024/09/18                 ITA   1.03     Context imported directly. Variable names moved into a single object named VarNames.
 *                                           Current user state moved to Global State.
 *                                           SMS authentication related features can now be turned on/off using the env variable REACT_APP_SMS_AUTH_ENABLED (true/false).
 * 2026/01/02  2026/02/11     ITA   1.04     Dropdowns now imported from dropdowns-js, where they were moved and refined.
 *                                           useCollectionsContext() removed. Dropdowns no longer use it.
 *                                           Form state data (object) split into smaller slices. So that key strokes cause a re-render to a small portion of the form instead of instead of the entire form, which is large.
 *                                           Improved data validation and editing functionality in keeping up with split state data.
 *                                           Moved a number of utility functions to an external package (some-common-functions-js) for further refinement, and reusability.
 *                                           Replaced loDash object manipulation functions with newly created counterparts in some-common-functions-js.
 * 2026/02/16  2026/02/18     ITA   1.05     Ensured that during submission of form data for updates, data only gets submitted to Firestore if there were changes.
 *                                           Improved the robustness of handling optional fields and updates thereto, so that data always complies to Firestore rules during submission.
 *                                           Ensured consistent pop up of toast messages when the toast is called, by placing the <ToastContainer> separate from the form and the loader.
 *                                           Dispatch of data to Global State is now doable using a single dispatch function instead of 2.
*/
import { useState, useEffect, useRef, useId } from 'react';
import { useGlobalStateContext } from '../hooks/GlobalStateProvider.js';
import { doc, setDoc, Timestamp, deleteField } from 'firebase/firestore';
import { db, isSignedIn, auth } from '../config/appConfig.js';
import { getAllProvinces, getMunicipalitiesPerProvince, getMainPlacesPerMunicipality, getSubPlacesPerMainPlace } from '../utilityFunctions/firestoreComms.js';
import toastifyTheme from './toastifyTheme.js';
import { ToastContainer, toast } from 'react-toastify';
import { isValidShortDescription, isValidStreetNo, hasValues } from '../utilityFunctions/commonFunctions.js';
import { get, set, unset, timeStampYyyyMmDd, isValidName, isValidPhoneNum } from 'some-common-functions-js';
import '../w3.css';
import EnrolUserForSMSAuth from './EnrolUserForSMSAuth.js';
import Loader from './Loader.js';
import { DropdownObj } from 'dropdowns-js';
import 'dropdowns-js/style.css';
import EditField from './EditField.jsx';
import FieldError from './FieldError.jsx';
import { useBackupStore } from '../hooks/BackupStore.js';

// Initial form data structure.
const init = Object.freeze({
    personalInfo: {
        displayName: '',
        firstName: '',
        surname: '',
        dateOfBirth: ''
    },
    contactInfo: {
        complexName: '',
        unitNo: '',
        streetNo: '',
        streetName: '',
        mobileNo: ''
    },
    gisCodes: {
        provincialCode: '',
        municipalityCode: '',
        mainPlaceCode: '',
        subPlaceCode: ''
    }
});

function AccountInfo() {
    const componentUid = useId();
    // Form inputs state==================
    const [personalInfo, setPersonalInfo] = useState({ ...init.personalInfo });
    const [contactInfo, setContactInfo] = useState({ ...init.contactInfo });
    const [gisCodes, setGisCodes] = useState({ ...init.gisCodes });
    //====================================

    // Form Input errors==================
    const [personalInfoErrors, setPersonalInfoErrors] = useState({});
    const [contactInfoErrors, setContactInfoErrors] = useState({});
    const [gisCodeErrors, setGisCodeErrors] = useState({});
    //======================================

    // Dropdown data======================-
    const [provinces, setProvinces] = useState([]);
    const [municipalities, setMunicipalities] = useState([]);
    const [mainPlaces, setMainPlaces] = useState([]);
    const [subPlaces, setSubPlaces] = useState([]);
    const sortFields = ['name asc'];
    //======================================

    // Default selected dropdown data
    const [selectedProvince, setSelectedProvince] = useState(null);
    const [selectedMunicipality, setSelectedMunicipality] = useState(null);
    const [selectedMainPlace, setSelectedMainPlace] = useState(null);
    const [selectedSubPlace, setSelectedSubPlace] = useState(null);

    const [updateMode, setUpdateMode] = useState(false); /* Update mode set to true means the user had populated their account data before.
                                                            and is likely to perform an update.
                                                            Update mode set to false means the user is capturing their account data for the first time.
                                                        */
    const smsAuthEnabled = (()=> {
        let temp = process.env.REACT_APP_SMS_AUTH_ENABLED;
        return temp === 'true';
    })();

    const backupStore = useBackupStore(); // Used to keep track of edited fields. By keeping their previous version.
 
    // Message to be displayed while data is loading. Null when complete.
    const [loadingMessage, setLoadingMessage] = useState(null);

    const { getSlice, dispatchPersonalDetails } = useGlobalStateContext();
    const firstRender = useRef(true);

    const [provincesLoaded, setProvincesLoaded] = useState(true);
    const [municipalitiesLoaded, setMunicipalitiesLoaded] = useState(true);
    const [mainPlacesLoaded, setMainPlacesLoaded] = useState(true);
    const [subPlacesLoaded, setSubPlacesLoaded] = useState(true);

    /**Set the provincial code of the form data to that of the selected province in the provinces dropdown.
     * Also reload the municpalities dropdown with the municipalities of the currently selected province. */
    async function provinceSelected(selProvince) {
        try {
            if (gisCodes.provincialCode === selProvince.code) // Do not proceed if there was no real change in the selection of the municipality code.
                return;                           // This is to save the cost of unnecessary trips to Firestore.
          
            const newGisCodes = { ...gisCodes, provincialCode: selProvince.code }; // Set the form provincial code to that of the currently selected province.
            setGisCodes(newGisCodes);
            setSelectedProvince(selProvince); // Synchronise the selected province state with the one in the dropdown.

            // Get municipalities linked to the selected province.
            setMunicipalitiesLoaded(false);
            setMunicipalities(await getMunicipalitiesPerProvince(selProvince.code));
        } catch (error) {
            toast.error(error, toastifyTheme);
        } finally {
            setMunicipalitiesLoaded(true);
        }
    } // function async provinceSelected(code) {

    /** Update the municipality code of the form data with that of the currently selected municipality in the
     * municipalities dropdown.
     * Also reload the main places dropdown with the main places of the currently selected municipality.
    */
    async function municipalitySelected(selMunicipality) {
        try {
            if (gisCodes.municipalityCode === selMunicipality.code) // Do no proceed if there was no real change in the municipality code selection.
                return;
            
            const newGisCodes = { ...gisCodes, municipalityCode: selMunicipality.code };
            setGisCodes(newGisCodes);
            setSelectedMunicipality(selMunicipality); // Synchronise the selected municipality state with the one in the dropdown.
            
            // Obtain the main places of the selected municipality.
            setMainPlacesLoaded(false);
            const tempMainPlaces = await getMainPlacesPerMunicipality(newGisCodes.provincialCode, newGisCodes.municipalityCode);
            setMainPlaces(tempMainPlaces);
        } catch (error) {
            toast.error(error, toastifyTheme);         
        } finally {
            setMainPlacesLoaded(true);
        } // finally
    } // async function municipalitySelected(code) {

    async function mainPlaceSelected(selMainPlace) {
        /* Update the form data with main-place code of the currently selected main place in the main places dropdown.
           Also reload the sub-places dropdown with the sub-places of the currently selected main place.
        */ 
        try {
            if (gisCodes.mainPlaceCode === selMainPlace.code) // Do not proceed if there was no real change in the main place selection.
                return;
    
            const newGisCodes = { ...gisCodes, mainPlaceCode: selMainPlace.code };
            setGisCodes(newGisCodes);

            setSelectedMainPlace(selMainPlace); // Synchronise the selected main place state with the one in the dropdown.
    
            // Get the sub-places linked to the selected main place.
            setSubPlacesLoaded(false);
            let subPlaces = [];
            setSubPlaces(await getSubPlacesPerMainPlace(newGisCodes.provincialCode, newGisCodes.municipalityCode, newGisCodes.mainPlaceCode));
        } catch (error) {
            toast.error(error, toastifyTheme);
        } finally {
            setSubPlacesLoaded(true);
        } // finally
    } // async function mainPlaceSelected() {

    async function subPlaceSelected(selSubPlace) {
        // Update the sub-place code of the form data to that of the currently selected sub-place in the sub-places dropdown.
        try {
            if (gisCodes.subPlaceCode === selSubPlace.code) // Do not proceed if there was no real change in the sub-place code selection.
                return;
            
            const newGisCodes = { ...gisCodes, subPlaceCode: selSubPlace.code};
            setGisCodes(newGisCodes);
            setSelectedSubPlace(selSubPlace); // Synchronise the selected sub-place state with the one in the dropdown. 
        } catch (error) {
            toast.error(error, toastifyTheme);
        } finally {
        } // finally
    } // async function subPlaceSelected(code) {


    function fieldsEdited() { // Indicate whether there any fields that were edited on the form.
        return backupStore.hasValues();
    }

    function disableButton() {
        if (updateMode === false) // New Account data entry. Enable the Save button.
            return false;

        // else: Account data update.

        if (fieldsEdited()) // If there were any fields that were edited, enable the Save button.
            return false;

        return true;
    } // function disableButton()

    /**Enable editing of fields or cancellation of edits. */
    function getEditComponent(path) {
        return (
            <>
                {(updateMode) &&
                    <EditField 
                        backupCallback={()=> backup(path)}
                        revertCallback={()=> revert(path)}
                        displayEditIcon={isNotEditable(path)}
                    />
                }
            </>
        );
    }

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
        path = path.replace(/-/gi, '.');
        const stateName = path.split('.')[0];
        const subPath = path.substring(stateName.length + 1);
        let obj;
        switch (stateName) {
            case 'personalInfo':
                obj = personalInfo;
                break;
            case 'contactInfo':
                obj = contactInfo;
                break;
            case 'gisCodes':
                obj = gisCodes;

                // Back up the dropdown data (lists and selected items).
                let placesType, placeType;
                switch (subPath) {
                    case 'provincialCode': // The original provincial code.
                        placesType = 'municipalities'; // To back up the (original) municipalities related to this provincial code.
                        placeType = 'province'; // To back up the selected (original) province.
                        break;
                    case 'municipalityCode': // The original municipality code.
                        placesType = 'mainPlaces'; // To back up the (original) main places related to this municipality code.
                        placeType = 'municipality'; // To back up the selected (original) municipality.
                        break;
                    case 'mainPlaceCode': // The original main place code.
                        placesType = 'subPlaces'; // To back up the (original) sub places related to this main place code.
                        placeType = 'mainPlace'; // To back up the selected (original) main place.
                        break;
                    case 'subPlaceCode': // The original sub place code.
                        placeType = 'subPlace'; // To back up the selected (original) sub place.
                        break;
                }
                if (placesType)
                    backupPlaces(placesType);
                if (placeType)
                    backupSelectedPlace(placeType);    
                break;
            default:
                break;
        }
        if (obj) {
            backupStore.store(path, get(obj, subPath));
        }
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
        path = path.replace(/-/gi, '.');
        const stateName = path.split('.')[0];
        const subPath = path.substring(stateName.length + 1);
        let obj;

        
        switch (stateName) {
            case 'personalInfo':
                obj = backupStore.getUpdatedIfDiff(personalInfo, path);
                if (obj) { // There were changes.
                    setPersonalInfo(obj);
                    validatePersonalInfo(obj);
                }
                break;
            case 'contactInfo':
                obj = backupStore.getUpdatedIfDiff(contactInfo, path);
                if (obj) {
                    setContactInfo(obj);
                    validateContactInfo(obj);
                }
                break;
            case 'gisCodes':
                obj = backupStore.getUpdatedIfDiff(gisCodes, path);
                if (obj) {
                    setGisCodes(obj);
                    validateGisCodes(obj);
                }
                
                // Revert the dropdown data were applicable.
                let placesType, placeType;
                switch (subPath) {
                    case 'provincialCode': // To revert to the original provincial code.
                        placesType = 'municipalities'; // To revert to the (original) municipalities linked to this provincial code.
                        placeType = 'province'; // To revert to the original selected province.
                        break;
                    case 'municipalityCode': // To revert to the original municipality code.
                        placesType = 'mainPlaces'; // To revert to the (original) main places linked to this municipality code.
                        placeType = 'municipality'; // To revert to the original selected municipality.
                        break;
                    case 'mainPlaceCode': // To revert to the original main place code.
                        placesType = 'subPlaces'; // To revert to the (original) sub places linked to this main place code.
                        placeType = 'mainPlace'; // To revert to the original selected main place.
                        break;
                    case 'subPlaceCode':
                        placeType = 'subPlace'; // To revert to the original selected sub place.
                        break;
                }
                if (placesType)
                    revertPlaces(placesType);
                if (placeType)
                    revertSelectedPlace(placeType);                    
            break;
        }        
    }

    /**Revert all the state data where changes were made. */
    function revertAll() {
        const paths = backupStore.getPaths();
        let tempPersonalInfo,
            tempContactInfo,
            tempGisCodes;
        const subPaths = [];

        for (const idx in paths) {
            const path = paths[idx];
            const stateName = path.split('.')[0];
            const subPath = path.substring(stateName.length + 1);
            console.log(subPath);
            switch (stateName) {
                case 'personalInfo':
                    tempPersonalInfo = tempPersonalInfo || personalInfo;
                    tempPersonalInfo = backupStore.getUpdatedIfDiff(tempPersonalInfo, path) || tempPersonalInfo;
                    break;
                case 'contactInfo':
                    tempContactInfo = tempContactInfo || contactInfo;
                    tempContactInfo = backupStore.getUpdatedIfDiff(tempContactInfo, path) || tempContactInfo;
                    break;
                case 'gisCodes':
                    tempGisCodes = tempGisCodes || gisCodes;
                    tempGisCodes = backupStore.getUpdatedIfDiff(tempGisCodes, path) || tempGisCodes;
                    subPaths.push(subPath);
                    break;
                default:
                    break;
            }
        }
        console.log(tempPersonalInfo, tempContactInfo);
        if (tempPersonalInfo) // There was revertion [because of edited] personalInfo fields.
            setPersonalInfo(tempPersonalInfo);
        if (tempContactInfo) // There was revertion of contactInfo fields.
            setContactInfo(tempContactInfo);
        if (tempGisCodes) { // There was revertion of gisCode fields.
            setGisCodes(tempGisCodes);

            // Revert the dropdown data where applicable.
            for (const idx in subPaths) {
                let placesType, placeType;
                switch (subPaths[idx]) {
                    case 'provincialCode': // To revert to the original provincial code.
                        placesType = 'municipalities'; // To revert to the (original) municipalities linked to this provincial code.
                        placeType = 'province'; // To revert to the original selected province.
                        break;
                    case 'municipalityCode': // To revert to the original municipality code.
                        placesType = 'mainPlaces'; // To revert to the (original) main places linked to this municipality code.
                        placeType = 'municipality'; // To revert to the original selected municipality.
                        break;
                    case 'mainPlaceCode': // To revert to the original main place code.
                        placesType = 'subPlaces'; // To revert to the (original) sub places linked to this main place code.
                        placeType = 'mainPlace'; // To revert to the original selected main place.
                        break;
                    case 'subPlaceCode':
                        placeType = 'subPlace'; // To revert to the original selected sub place.
                        break;
                }
                if (placesType)
                    revertPlaces(placesType);
                if (placeType)
                    revertSelectedPlace(placeType);  
            }
        }
    }
    

    /** Basically check if this path has an entry in the backupStore. */
    function isEditable(fieldPath) {
        if (!updateMode) // Meaning this is a new account data capture. Return true.
            return true;

        return backupStore.get(fieldPath) !== undefined;
    } // function isEditable(fieldPath)

    function isNotEditable(fieldPath) {
        return !isEditable(fieldPath);
    } // function isNotEditable(field)

    async function retrieveAccountInfo() {
    // Retrieve user data from Firestore and populate the form data.
        if (!isSignedIn()) {
            return false; // User not signed in. Do not proceed further than this.
        } // if (isSignedIn() === null)
        
        setLoadingMessage('Retrieving your account information ...');
        
        // If the user (personalDetails) data is already there in the global state, retrieve from there,
        // to reduce fetch trips (and related costs) to Firestore.
        const personalDetails = getSlice('authCurrentUser.personalDetails');
        // userDoc = {
        //        personalDetails: {
        //            displayName: 'JackStober',
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
        const data = {};
        try {
            if (personalDetails) {
                const { displayName, firstName, surname, dateOfBirth, mobileNo, address } = personalDetails;
                data.personalInfo = {
                    displayName, firstName, surname, dateOfBirth             
                };
                const { provincialCode, municipalityCode, mainPlaceCode, subPlaceCode, ...contactDetails } = address;
                data.contactInfo = {
                    ...init.contactInfo, mobileNo, ...contactDetails
                };
                data.gisCodes = {
                    provincialCode, municipalityCode, mainPlaceCode, subPlaceCode
                };
                data.personalInfo.dateOfBirth = timeStampYyyyMmDd(new Date(dateOfBirth.toString()));
                setPersonalInfo(data.personalInfo);
                setContactInfo(data.contactInfo);
                setGisCodes(data.gisCodes);
                setUpdateMode(true); // Indicate that the form has been populated with data, and updates can be done by user.
                                    // Meaning the user can selectively update/edit the fields.
            } // if (personalDetails)
            else {
                setUpdateMode(false); // Meaning this is a new account info entry.
            } // else
        } // try
        catch (error) {
            console.log(error);
            toast.error('Some error occurred here. Please try again.', toastifyTheme);
            return false;
        } // catch (error)
        finally {            
            setLoadingMessage(null);
        } // finally

        try {
            if (hasValues(data)) {
                // For the dropdowns
                // 1.1. Provinces already loaded.
                setProvincesLoaded(false);
                let tempProvinces = provinces;
                if (tempProvinces.length === 0) { // Provinces not loaded.
                    tempProvinces = await getAllProvinces();
                    setProvinces(tempProvinces);
                }
                const selProvince = tempProvinces.find(prov=>{
                    return prov.code === data.gisCodes.provincialCode;
                });
                if (selProvince) {
                    setSelectedProvince(selProvince); // 1.2. Default selected province.
                } // if (seldProvince !== undefined) {

                setMunicipalitiesLoaded(false);
                // 2.1. Municipalities.
                if (data.gisCodes.provincialCode !== '' && data.gisCodes.municipalityCode !== '' 
                    && data.gisCodes.mainPlaceCode !== '' && data.gisCodes.subPlaceCode !== '') {
                    const selProvince = provinces.find(prov=> (prov.code === data.gisCodes.provincialCode));
                    if (selProvince)
                        setSelectedProvince(selProvince);

                    const tempMunicipalities = await getMunicipalitiesPerProvince(data.gisCodes.provincialCode);
                    if (tempMunicipalities) {
                        setMunicipalities(tempMunicipalities);
                    
                        // 2.2. Set the default selected municipality code in the dropdown.
                        const selMunicipality = tempMunicipalities.find(municipality=> {
                            return municipality.code === data.gisCodes.municipalityCode;
                        });
                        if (selMunicipality)
                            setSelectedMunicipality(selMunicipality);
                    }
                }

                // Load the main places of the user address' municipality code
                setMainPlacesLoaded(false);
                // 3.1. Main places
                const tempMainPlaces = await getMainPlacesPerMunicipality(data.gisCodes.provincialCode, data.gisCodes.municipalityCode);
                if (tempMainPlaces) {
                    setMainPlaces(tempMainPlaces);
                            
                    // 3.2. Set default selected main place.
                    const selMainPlace = tempMainPlaces.find(mainPlace=> mainPlace.code === data.gisCodes.mainPlaceCode);
                    if (selMainPlace)
                        setSelectedMainPlace(selMainPlace);
                }
                setSubPlacesLoaded(false);
                const tempSubPlaces = await getSubPlacesPerMainPlace(data.gisCodes.provincialCode, data.gisCodes.municipalityCode,
                                                                     data.gisCodes.mainPlaceCode);
                if (tempSubPlaces) {
                    setSubPlaces(tempSubPlaces);
                    const selSubPlace = tempSubPlaces.find(place=> place.code === data.gisCodes.subPlaceCode);
                    if (selSubPlace)
                        setSelectedSubPlace(selSubPlace);
                }

            } // if (hasValues(data)) {
        } catch (error) {
            console.log(error);
            toast.error(error, toastifyTheme);
        } finally {
            setLoadingMessage(null); // Remnove the spinners and display the loaded data.
            setProvincesLoaded(true);
            setMunicipalitiesLoaded(true);
            setMainPlacesLoaded(true);
            setSubPlacesLoaded(true);
        } // finally
    } // async function retrieveAccountInfo()
        
    function handleChange(e) {
        const path = e.target.name.replace(/-/gi, '.');
        const stateName = path.split('.')[0];
        const subPath = path.substring(stateName.length + 1);
        const value = e.target.value;
        let obj;
        switch(stateName) {
            case 'personalInfo':
                obj = { ...personalInfo };
                set(obj, subPath, value);
                setPersonalInfo(obj);
                validatePersonalInfo(obj);
                break;
            case 'contactInfo':
                obj = { ...contactInfo };
                set(obj, subPath, value);
                setContactInfo(obj);
                validateContactInfo(obj);
                break;
            case 'gisCodes':
                obj = { ...gisCodes };
                set(obj, subPath, value);
                setGisCodes(obj);
                validateGisCodes(obj);
                break;
        } 
    } // function handleChange(e)

    function validatePersonalInfo(pPersInfo) {
        const errorList = {};
        if (isValidName(pPersInfo.displayName) === false)
            errorList.displayName = 'Invalid display name!';
        if (isValidName(pPersInfo.firstName) === false)
            errorList.firstName = 'Please fill in a valid First Name!';
        
        if (isValidName(pPersInfo.surname) === false)
            errorList.surname = 'Please fill in a valid Surname!';

        // Date of birth must be 18 to 100 years old.
        let currDateMilliSec = new Date().getTime();
        let yearsToMilliSec = 365.25 * 24 * 60 * 60 * 1000;

        let dateDiff = currDateMilliSec - new Date(pPersInfo.dateOfBirth).getTime(); // birth date in milliseconds.
        let valid = dateDiff >= 18 * yearsToMilliSec
                    && dateDiff <= 100 * yearsToMilliSec;
        if (valid === false)
            errorList.dateOfBirth = 'Must be 18 to 100 years old!';

        setPersonalInfoErrors(errorList);
        return (!hasValues(errorList));
    }

    function validateContactInfo(pContactInfo) {
        const errorList = {};
        if ((pContactInfo.complexName !== '') && isValidShortDescription(pContactInfo.complexName) === false) 
            errorList.complexName = 'Please fill in a valid Complex Name!';
        
        if ((pContactInfo.unitNo !== '') && isValidStreetNo(pContactInfo.unitNo) === false)
            errorList.unitNo = 'Please fill in a valid Unit No!';
        
        if (isValidStreetNo(pContactInfo.streetNo) === false)
            errorList.streetNo = 'Please fill in a valid Street No!';
        
        if ((pContactInfo.streetName !== '') && isValidShortDescription(pContactInfo.streetName) === false)
            errorList.streetName = 'Please fill in a valid Street Name!';
        
        if (isValidPhoneNum(pContactInfo.mobileNo) === false)
            errorList.mobileNo = 'Please fill in a valid Mobile Number!';
        
        setContactInfoErrors(errorList);
        return (!hasValues(errorList));
    }

    function validateGisCodes(pGisCodes) {
        const errorList = {};
        if (!provinces.some(province=> (pGisCodes.provincialCode === province.code)))
            errorList.provincialCode = 'Please choose a valid province!';
        
        if (!municipalities.some(municipality=> (pGisCodes.municipalityCode === municipality.code)))
            errorList.municipalityCode = 'Please choose a valid municipality!';
        
        if (!mainPlaces.some(mainPlace=> (pGisCodes.mainPlaceCode === mainPlace.code)))
            errorList.mainPlaceCode = 'Please choose a valid main place!';
        
        if (!subPlaces.some(subPlace=> (pGisCodes.subPlaceCode === subPlace.code)))
            errorList.subPlaceCode = 'Please choose a valid sub-place !';        

        setGisCodeErrors(errorList);
        return (!hasValues(errorList)); // true if there were no errors, false if there were errors.
    } // function validateGisCodes(pGisCodes)

    function validate() {
        const results = {
            personalInfo: validatePersonalInfo(personalInfo), // personalInfo validation results.
            contactInfo: validateContactInfo(contactInfo), // contactInfo validation results.
            gisCodes: validateGisCodes(gisCodes) // gisCodes validation results.
        };

        for (const key in results) {
            if (results[key] === false) // Invalid data found.
                return false;
        }
        return true;
    }

    async function submitData(e) {
        e.preventDefault();

        let backupValue;
        /*============== If this a user update, track if any real changes occurred =============*/
        let countChanges = 0;
        const backupPaths = backupStore.getPaths();
        for (const idx in backupPaths) {
            const path = backupPaths[idx];
            const splits = path.split('.');
            const startsWith = splits[0]; // The backup paths start with the names of the state slices.
            const subPath = path.substring(startsWith.length + 1);
            backupValue = backupStore.get(path);
            let stateValue;
            switch (startsWith) {
                case 'personalInfo':
                    stateValue = get(personalInfo, subPath);
                    break;
                case 'contactInfo':
                    stateValue = get(contactInfo, subPath);
                    break;
                case 'gisCodes':
                    stateValue = get(gisCodes, subPath);
                    break;
                default:
                    continue;
            }
            if (stateValue !== backupValue)
                countChanges++;
        }
        if ((backupPaths.length > 0) && (countChanges === 0)) { // Do not  proceed if no real changes occurred.
            setLoadingMessage(null);
            backupStore.clearAll();
            toast.success('No changes found.', toastifyTheme);
            return;
        }
        /*=======================================================*/

        if (!validate()) {
            toast.error('Some errors occurred. Please check your input, and try again!', toastifyTheme);
            return;
        } // if (!(awaitvalidate()))

        setLoadingMessage('Updating your account information. Please wait...');
        
        const { displayName, firstName, surname, dateOfBirth, mobileNo,
                complexName, unitNo, streetNo, streetName,
                provincialCode, municipalityCode, mainPlaceCode, subPlaceCode} = {
                    ...personalInfo, ...contactInfo, ...gisCodes
                };
        const email = auth.currentUser.email;
        
        let data = { // Structured according to the schema of the users collection in Firestore.
            personalDetails: {
                displayName,
                firstName,
                surname, 
                // Convert the dateOfBirth first to a date type, then a Firestore Timestamp type.
                dateOfBirth: Timestamp.fromDate(new Date(dateOfBirth)),
                mobileNo,
                email,
                address: {
                    complexName,
                    unitNo,
                    streetNo,
                    streetName,
                    provincialCode,
                    municipalityCode,
                    mainPlaceCode,
                    subPlaceCode
                } // address
            }, // personalDetails
            flagged: false
        } // const data

        // Handling the optional field complexName.
        if (data.personalDetails.address.complexName === '') {
            backupValue = backupStore.get('contactInfo.complexName');
            if (backupValue) // There was a backupif (backupValue) // Previously there was a complex name, and has been removed in the address update.
                data.personalDetails.address.complexName = deleteField(); // Instruct Firestore to remove this field during update.
            else 
                unset(data, 'personalDetails.address.complexName'); // Remove the complexName field. It was, and is still blank.
        }

        // Handling the optional field unitNo
        if (data.personalDetails.address.unitNo === '') {
            backupValue = backupStore.get('contactInfo.unitNo');
            if (backupValue) // Previously there was a unit no., and has been removed in the update
                data.personalDetails.address.unitNo = deleteField(); // Instruct Firestore to remove this field during the update.
            else
                unset(data, 'personalDetails.address.unitNo'); // Remove the unitNo. It was, and is still blank.
        }

        // Handling the optional field streetName
        if (data.personalDetails.address.streetName === '') {
            backupValue = backupStore.get('contactInfo.streetName');
            if (backupValue) // Previously there was a streetName, and has been removed in the update 
                data.personalDetails.address.streetName = deleteField(); // Instruct Firestore to remove this field.
            else
                unset(data, 'personalDetails.address.streetName'); // Remove the streetName. It was, and is still blank.
        }
        
        const docRef = doc(db, '/users', getSlice('authCurrentUser.uid'));
        let anError;
        await setDoc(docRef, data, {merge: true})
              .then(result=> {
                    dispatchPersonalDetails({
                        ...data.personalDetails, dateOfBirth: new Date(dateOfBirth)
                    });
                    backupStore.clearAll(); // Clear the backup store as the data has been successfully updated.
                    setUpdateMode(true);
                    toast.success('Account Personal Details updated!', toastifyTheme);
                })
              .catch(error=> {                    
                    toast.error(anError, toastifyTheme);
                })
              .finally(()=> setLoadingMessage(null));
    } // async function submitData(e)

    useEffect(() => {   
        (async ()=> {
            if (!getSlice('authCurrentUser'))
                return;

            if (firstRender.current === false)
                return;

            firstRender.current = false;
            try {
                setProvincesLoaded(false);
                setProvinces(await getAllProvinces());
                provinces = provinces.map(province=> ({...province}));                
            } catch(error) {
                toast.error(error, toastifyTheme);
            } finally {
                setProvincesLoaded(true);
            } // finally {
        })();

        retrieveAccountInfo();
    }, [getSlice('authCurrentUser')]); // useEffect()


    return (
        <>
            {(loadingMessage)?
                <Loader message={loadingMessage}/>
                :
                <div className='w3-container'>
                    <form onSubmit={submitData}>           
                        <h1>Account Personal Details</h1>
                        <div className='w3-padding-small'>
                            <label htmlFor='personalInfo-displayName'>* Display Name</label>
                            <input name='personalInfo-displayName' id='personalInfo-displayName' auto-complete='off' disabled={isNotEditable('personalInfo.displayName')} required={true} maxLength={50} minLength={2} aria-required={true} className='w3-input w3-input-theme-1' type='text'
                                    aria-label='Display Name' onChange={e=> handleChange(e)} value={personalInfo.displayName} />
                            {getEditComponent('personalInfo.displayName')}
                            <FieldError error={personalInfoErrors?.displayName}/>
                        </div>

                        <div className='w3-padding-small'>
                            <label htmlFor='personalInfo-firstName'>* First Name</label>
                            <input name='personalInfo-firstName' id='personalInfo-firstName'    auto-complete='off' disabled={isNotEditable('personalInfo.firstName')} required={true} aria-required={true} maxLength={50} minLength={2} className='w3-input w3-input-theme-1' type='text'
                                    aria-label='First Name' onChange={e=> handleChange(e)} value={personalInfo.firstName} />
                            {getEditComponent('personalInfo.firstName')}
                            <FieldError error={personalInfoErrors?.firstName}/>
                        </div>
                        
                        <div className='w3-padding-small'>
                            <label htmlFor='personalInfo-surname'>* Surname</label>
                            <input name='personalInfo-surname' id='personalInfo-surname'    auto-complete='off' disabled={isNotEditable('personalInfo.surname')} required={true} aria-required={true} maxLength={50} minLength={2} className='w3-input w3-input-theme-1' type='text'
                                    aria-label='Surname' onChange={e=> handleChange(e)} value={personalInfo.surname} />
                            {getEditComponent('personalInfo.surname')}
                            <FieldError error={personalInfoErrors?.surname}/>
                        </div>
                        
                        <div className='w3-padding-small'>
                            <label htmlFor='personalInfo-dateOfBirth'>* Date of Birth</label>
                            <input name='personalInfo-dateOfBirth' id='personalInfo-dateOfBirth' auto-complete='off' disabled={isNotEditable('personalInfo.dateOfBirth')} required={true} aria-required={true} className='w3-input w3-input-theme-1' type='date' 
                                    aria-label='Date of Birth'    onChange={e=> handleChange(e)} value={personalInfo.dateOfBirth} />
                            {getEditComponent('personalInfo.dateOfBirth')}
                            <FieldError error={personalInfoErrors?.dateOfBirth}/>
                        </div>                                        

                        <div className='w3-padding-small w3-padding-top-24'>
                            <label htmlFor='contactInfo-mobileNo'>* Mobile No.</label>
                            <input name='contactInfo-mobileNo' id='contactInfo-mobileNo'    auto-complete='off' disabled={isNotEditable('contactInfo.mobileNo')} required={true} aria-required={true} maxLength={15} className='w3-input w3-input-theme-1' type='tel' 
                                    aria-label='Mobile Number' onChange={e=> handleChange(e)} value={contactInfo.mobileNo} />
                            {getEditComponent('contactInfo.mobileNo')}
                            <FieldError error={contactInfoErrors?.mobileNo}/>
                        </div>

                        <div className='w3-padding-top-24'>
                            <h4>Address</h4>    
                            <div className='w3-padding-small'>
                                <label htmlFor='contactInfo-complexName'>Buiding or Complex Name (Optional)</label>
                                <input name='contactInfo-complexName' id='contactInfo-complexName' auto-complete='off' disabled={isNotEditable('contactInfo.complexName')} maxLength={50}    minLength={2} className='w3-input w3-input-theme-1' type='text' 
                                        aria-label='Building or Complex Name (Optional)' onChange={e=> handleChange(e)} value={contactInfo.complexName}    />
                                {getEditComponent('contactInfo.complexName')}
                                <FieldError error={contactInfoErrors?.complexName}/>
                            </div>

                            <div className='w3-padding-small'>
                                <label htmlFor='contactInfo-unitNo'>Unit No. (Optional)</label>
                                <input name='contactInfo-unitNo' id='contactInfo-unitNo' auto-complete='off' disabled={isNotEditable('contactInfo.unitNo')} maxLength={25} className='w3-input w3-input-theme-1' type='text' 
                                        aria-label='Unit Number (Optional)' onChange={e=> handleChange(e)} value={contactInfo.unitNo} />
                                {getEditComponent('contactInfo.unitNo')}
                                <FieldError error={contactInfoErrors?.unitNo}/>
                            </div>

                            <div className='w3-padding-small'>
                                <label htmlFor='contactInfo-streetNo'>* Street No.</label>
                                <input name='contactInfo-streetNo' id='contactInfo-streetNo' auto-complete='off' disabled={isNotEditable('contactInfo.streetNo')} required={true} aria-required={true} maxLength={10} autoComplete='off'
                                        className='w3-input w3-input-theme-1' type='text' aria-label='Street Number'
                                        onChange={e=> handleChange(e)} value={contactInfo.streetNo} />
                                {getEditComponent('contactInfo.streetNo')}
                                <FieldError error={contactInfoErrors?.streetNo}/>
                            </div>
                    
                            <div className='w3-padding-small'>
                                <label htmlFor='contactInfo-streetName'>Street Name (Optional)</label>
                                <input name='contactInfo-streetName' id='contactInfo-streetName' auto-complete='off' disabled={isNotEditable('contactInfo.streetName')} maxLength={50} minLength={2} 
                                        className='w3-input w3-input-theme-1' type='text' aria-label='Street Name (Optional)' onChange={e=> handleChange(e)}
                                        value={contactInfo.streetName} />
                                {getEditComponent('contactInfo.streetName')}
                                <FieldError error={contactInfoErrors?.streetName}/>
                            </div>
                            
                            {provincesLoaded?
                                <div className='w3-padding-small'>
                                    <label htmlFor='gisCodes-province'>* Province</label><br/>
                                    <DropdownObj
                                        name='gisCodes-province' id='gisCodes-province' label='Province'
                                        isDisabled={isNotEditable('gisCodes.provincialCode')}
                                        displayName='name' valueName='code'
                                        sortFields={sortFields}
                                        data={provinces}
                                        selected={selectedProvince}
                                        selReset={isNotEditable('gisCodes.provincialCode')}
                                        onItemSelected={provinceSelected}
                                        dropdownStyle={{backgroundColor: '#a6b9a0', color: '#000'}}
                                    />
                                    {getEditComponent('gisCodes.provincialCode')}
                                    <FieldError error={gisCodeErrors?.provincialCode}/>
                                </div>
                                :
                                <Loader message='Loading provinces ...' small={true}/>
                            }

                            {municipalitiesLoaded?
                                <div className='w3-padding-small'>
                                    <label htmlFor={`${componentUid}-municipality`}>* Municipality</label><br/>
                                    <DropdownObj 
                                        name='municipality' id={`${componentUid}-municipality`} label='Municipality' 
                                        isDisabled={isNotEditable('gisCodes.municipalityCode')}
                                        displayName='name' valueName='code' 
                                        sortFields={sortFields}
                                        data={municipalities}
                                        selected={selectedMunicipality}
                                        selReset={isNotEditable('gisCodes.municipalityCode')}
                                        onItemSelected={municipalitySelected}
                                        dropdownStyle={{backgroundColor: '#a6b9a0', color: '#000'}}
                                    />
                                    {getEditComponent('gisCodes.municipalityCode')}
                                    <FieldError error={gisCodeErrors?.municipalityCode}/>
                                </div>
                                :
                                <Loader message='Loading municipalities ...' small={true} />
                            }
                            
                            {mainPlacesLoaded?                            
                                <div className='w3-padding-small'>
                                    <label htmlFor={`${componentUid}-mainPlace`}>* Main Place</label><br/>
                                    <DropdownObj name='mainPlace' id={`${componentUid}-mainPlace`} label='* Main Place'
                                        isDisabled={isNotEditable('gisCodes.mainPlaceCode')}
                                        displayName='name' valueName='code'
                                        sortFields={sortFields}
                                        data={mainPlaces}
                                        selected={selectedMainPlace}
                                        selReset={isNotEditable('gisCodes.mainPlaceCode')}
                                        onItemSelected={mainPlaceSelected}
                                        dropdownStyle={{backgroundColor: '#a6b9a0', color: '#000'}}
                                    />
                                    {getEditComponent('gisCodes.mainPlaceCode')}
                                    <FieldError error={gisCodeErrors?.mainPlaceCode}/>
                                </div>
                                :
                                <Loader message='Loading main places ...' small={true}/>
                            }

                            {subPlacesLoaded?
                                <div className='w3-padding-small'>
                                    <label htmlFor={`${componentUid}-subPlace`}>* Sub Place</label><br/>
                                    <DropdownObj id={`${componentUid}-subPlace`} name='subPlace' label='* Sub Place'
                                        isDisabled={isNotEditable('gisCodes.subPlaceCode')}
                                        displayName='name' valueName='code' 
                                        sortFields={sortFields}
                                        data={subPlaces}
                                        selected={selectedSubPlace}
                                        selReset={isNotEditable('gisCodes.subPlaceCode')}
                                        onItemSelected={subPlaceSelected}
                                        dropdownStyle={{backgroundColor: '#a6b9a0', color: '#000'}}
                                    />
                                    {getEditComponent('gisCodes.subPlaceCode')}
                                    <FieldError error={gisCodeErrors?.subPlaceCode}/>
                                </div>
                                :
                                <Loader message='Loading sub-places ...' small={true} />
                            }
                        </div>
                                                
                        {smsAuthEnabled && updateMode && 
                            <EnrolUserForSMSAuth phoneNumber={contactInfo.mobileNo} displayName={personalInfo.displayName}/>
                        }
                                            
                        <div className='w3-padding'>
                            <button className='w3-btn w3-margin-small w3-theme-d5 w3-round' title='Save' disabled={disableButton()} type='submit'>Save</button>
                        </div>
                                            
                        <div className='w3-padding'>
                            <button className='w3-btn w3-margin-small w3-theme-d5 w3-round' title='Cancel' disabled={disableButton()} 
                                            onClick={e=> revertAll()} type='button'>Cancel</button>
                        </div>
                    </form>
                </div>
            }
            <>
                <ToastContainer/>
            </>
        </>
    );
}

export default AccountInfo;
