/**
 * File: ./src/components/SearchListings.js
 * Description:
 * Facilitate searching of listings.
 * 
 * Date         Dev  Version  Description
 * 2024/01/11   ITA  1.00     Genesis.
 * 2024/05/01   ITA  1.01     Add header comment. Update the paths.
 */
import { useEffect, useState, useContext, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { collectionsContext } from '../hooks/CollectionsProvider';
import { sharedVarsContext } from '../hooks/SharedVarsProvider';
import { ToastContainer, toast } from 'react-toastify';
import { BiErrorCircle } from 'react-icons/bi';
import { BsCheck } from 'react-icons/bs';
import MultiSelectionDropdown from './MultiSelectionDropdown';
import MultiSelectionDropdown2 from './MultiSelectionDropdown2';
import Dropdown from './Dropdown';
import { getAllProvinces, getMunicipalitiesOfTheProvinces, getMainPlacesOfTheMunicipalities,
         transactionTypes, propertyTypes, numberOfBedrooms, PROVINCES, MUNICIPALITIES,
         MAIN_PLACES, TRANSACTION_TYPES, PROPERTY_TYPES, NUMBER_OF_BEDROOMS, 
         PRICE_FROM, PRICE_TO, getListingsQueryObject, QUERY_TIME,
         GET_LISTINGS_QUERY_OBJECT } from '../utilityFunctions/firestoreComms';
import { getSortedObject } from '../utilityFunctions/commonFunctions';
import Loader from './Loader';
import toastifyTheme from './toastifyTheme';
const loDash = require('lodash');

const keyStep = 0.001;

function SearchListings() {
    const navigate = useNavigate();
    const location = useLocation();
    const { addCollection, updateCollection, getCollectionData, 
            getSelected, setSelected, collectionExists } = useContext(collectionsContext);
    const { addVar, updateVar, varExists, getVar } = useContext(sharedVarsContext);

    /**Set to false while the data of the respective dropdowns is being loaded, set to false thereafter. */
    const [transactionTypesLoaded, setTransactionTypesLoaded] = useState(true);
    const [propertyTypesLoaded, setPropertyTypesLoaded] = useState(true);
    const [numberOfBedroomsLoaded, setNumberOfBedroomsLoaded] = useState(true);
    const [provincesLoaded, setProvincesLoaded] = useState(true);
    const [municipalitiesLoaded, setMunicipalitiesLoaded] = useState(true);
    const [mainPlacesLoaded, setMainPlacesLoaded] = useState(true);
    const [queryComplete, setQueryComplete] = useState(true);

    /* The key variable below are set, in order to cause a re-render whenever the transaction
       types, property types, provinces, municipalities and main places dropdowns need to be reloaded
       with data. */
    const [provincesKey, setProvincesKey] = useState(Math.random());
    const [municipalitiesKey, setMunicipalitiesKey] = useState(Math.random());
    const [mainPlacesKey, setMainPlacesKey] = useState(Math.random());
    /* The keys were unnecessary for transaction types and property types dropdowns, since they only need to re-render once,
       but they had to be used in order to force, through re-render, the transaction types and property types dropdowns to 
       display their data.*/
    const [transactionTypesKey, setTransactionTypesKey] = useState(Math.random());
    const [propertyTypesKey, setPropertyTypesKey] = useState(Math.random());
    const [numberOfBedroomsKey, setNumberOfBedroomsKey] = useState(Math.random());

    const [priceFrom, setPriceFrom] = useState('');
    const [priceTo, setPriceTo] = useState('');

    const [errors, setErrors] = useState({});
    const firstRenderRef = useRef(true);

    function handleChange(e) {        
        switch(e.target.name) {
            case 'priceFrom':
                setPriceFrom(e.target.value);
                break;
            case 'priceTo':
                setPriceTo(e.target.value);
                break;
        }
        validate();
    } // function handleChange(e) {

    function validate() {
    // Validate user input.
        const errorList = {};
        try {
            // Check whether any provinces were selected.
            let selectedProvinces = getSelected(PROVINCES);
            
            if (selectedProvinces.length === 0) // No province selected.
                errorList[PROVINCES] = 'No provinces selected!';
            
            // Check whether any municipalities were selected.
            let selectedMunicipalities = getSelected(MUNICIPALITIES);
            
            if (selectedMunicipalities.length === 0)
                errorList[MUNICIPALITIES] = 'No municipalities selected!';

            // Check whether any main places were selected.
            let selectedMainPlaces = getSelected(MAIN_PLACES);            
            if (selectedMainPlaces.length === 0)
                errorList[MAIN_PLACES] = 'No main places selected!';
            
            // Check whether any transaction types were selected.
            let selectedTransTypes = getSelected(TRANSACTION_TYPES);
            if (selectedTransTypes.length === 0)
                errorList[TRANSACTION_TYPES] = 'No transaction types selected!';
            
            // Check whether any property types were selected.
            let selectedPropertyTypes = getSelected(PROPERTY_TYPES);
            if (selectedPropertyTypes.length === 0)
                errorList[PROPERTY_TYPES] = 'No property types selected!';

            // Check whether any number of bedrooms were selected.
            let selectedNumBedrooms = getSelected(NUMBER_OF_BEDROOMS);

            if (selectedNumBedrooms.length === 0)
            errorList[NUMBER_OF_BEDROOMS] = 'No number of bedrooms selected!'

            // Check whether the minimum price was set.
            if (!(priceFrom !== '' && Number.parseFloat(priceFrom) >= 0))
                errorList['priceFrom'] = 'Invalid minimum price!';

            if (!(priceTo !== '' && Number.parseFloat(priceTo) > 0))
                errorList['priceTo'] = 'Invalid maximum price!';
            
            if ((errorList['priceFrom'] === undefined)
                    && (errorList['priceTo'] === undefined)
                    && (Number.parseFloat(priceFrom) <= Number.parseFloat(priceTo)) === false)
                errorList['priceTo'] = 'Maximum price cannot be less than the minimum price.'

            setErrors(errorList);            
            return (Object.keys(errorList).length === 0);
        } catch (error) { 
            /* At this point of code execution, the collections have been set up, so the concern is here
               about whether a selection has been made on the collection, than whether the collection exists. */            
        }
    } // function validate() {

    async function provincesSelected() {
    // Update the municipalities and their respective main places in keeping up with the currently selected provinces.
        try {
            // Get the currently selected provinces.
            let selectedProvinces = getSelected(PROVINCES);

            // Get the previously loaded municipalities...
            let prevMunicipalities = getCollectionData(MUNICIPALITIES);        
            // Get the previously loaded municipalities that belong to the currently selected provinces.
            const municipalities = prevMunicipalities.filter(municipality=> {
                return selectedProvinces.findIndex(province=> {
                    return province.code === municipality.provincialCode;
                }) >= 0;
            });
    
            // Get the main places that belong municipalities of the currently selected provinces.
            let mainPlaces = getCollectionData(MAIN_PLACES);
            mainPlaces = mainPlaces.filter(mainPlace=> {
                return selectedProvinces.findIndex(province=> {
                    return province.code === mainPlace.provincialCode;
                }) >= 0;
            });
            
        // Get the newly selected provinces (with no municipalities previously loaded for them).   
        const newProvinces = selectedProvinces.filter(province=> {
            return prevMunicipalities.findIndex(municipality=> {
                return municipality.provincialCode === province.code;
            }) < 0;
        });
        const newProvincialCodes = newProvinces.map(province=> province.code);

        // Load the municipalities and main places for the newly selected provinces.
        let newMunicipalities = [];
        setMunicipalitiesLoaded(false); // Turns the spinner/loader on.
        await getMunicipalitiesOfTheProvinces(newProvincialCodes) // An array of resolved Promises.
                .then(results=> {
                    results.forEach(result=> {
                        if (result.status === 'fulfilled') {
                            let municipalitiesResult = result.value;
                            // All the  result array objects have the same provincialCode.
                            const aProvince = newProvinces.find(province=> province.code === municipalitiesResult[0].provincialCode);
                            municipalitiesResult = municipalitiesResult.map(item=> {
                                // Add a sort field to the results.
                                const sortField = `${aProvince.name}_${item.name}`; // provincialName_municipalityName.
                                return getSortedObject({
                                            ...item,
                                            sortField
                                        });
                            });
                            newMunicipalities = [...newMunicipalities, ...municipalitiesResult];
                        }
                        else { // if (result.status === 'rejected')'
                            throw new Error(result.reason);
                        }
                    })
                });

            // Update the municipalities and mainplaces collections.
            updateCollection(MUNICIPALITIES, [...municipalities, ...newMunicipalities]);
            updateCollection(MAIN_PLACES, mainPlaces);

            
        } catch (error) {
            toast.error(error, toastifyTheme);
        } finally {
            setProvincesKey(provincesKey + keyStep);
            setMunicipalitiesLoaded(true);
            setMunicipalitiesKey(municipalitiesKey + keyStep);
            setMainPlacesKey(mainPlacesKey + keyStep);
            validate();
        } // finally
    } // async function provincesSelected()

    async function municipalitiesSelected() {
    // Set the selected municipalities to the municipalities currently selected in the multi-selection dropdown.
        try {
            // Get the currently selected provinces
            let selectedProvinces = getSelected(PROVINCES);

            // Get the currently selected municipalities...
            let selectedMunicipalities = getSelected(MUNICIPALITIES);
            
            // Get the previously loaded main places...
            let prevMainPlaces = getCollectionData(MAIN_PLACES);
            
            // Get the main places whose municipalities are currently selected.----------------------------------------
            const mainPlaces = prevMainPlaces.filter(mainPlace=> {
                return selectedMunicipalities.findIndex(municipality=> {
                    return municipality.provincialCode === mainPlace.provincialCode
                            && municipality.code === mainPlace.municipalityCode;
                }) >= 0;
            });

            // Get the newly selected municipalities (they have no main places loaded for them)
            const newMunicipalities = selectedMunicipalities.filter(municipality=> {
                return prevMainPlaces.findIndex(mainPlace=> {
                    return mainPlace.provincialCode === municipality.provincialCode
                            && mainPlace.municipalityCode === municipality.code
                }) < 0;
            });
        
            // Load the main places for these newly selected municipalities.
            let newMainPlaces = [];
            setMainPlacesLoaded(false);
            await getMainPlacesOfTheMunicipalities(newMunicipalities)
                    .then(results=> { // results is an array.
                        results.forEach(result=> {
                            if (result.status === 'fulfilled') {
                                let mainPlacesResult = result.value;

                                if (mainPlacesResult.length > 0) {
                                        // Todo: add a sortField to each result array element.
                                    // The main place objects of a result.value array have the same provincialCode and municipalityCode
                                    const aMunicipality = newMunicipalities.find(municipality=> {
                                        return municipality.code === mainPlacesResult[0].municipalityCode
                                                && municipality.provincialCode === mainPlacesResult[0].provincialCode;
                                    });
            
                                    const aProvince = selectedProvinces.find(province=> {
                                        return province.code === mainPlacesResult[0].provincialCode;
                                    });
            
                                    // Add the sort field each result array element.
                                    mainPlacesResult = mainPlacesResult.map(aMainPlace=> {                                
                                        const sortField = `${aProvince.name}_${aMunicipality.name}_${aMainPlace.name}`;
                                        return getSortedObject({
                                            ...aMainPlace,
                                            sortField
                                        });
                                    });
                                    newMainPlaces = [...newMainPlaces, ...mainPlacesResult];  
                                } // if (mainPlacesResult.length > 0) {                     
                            } // if (result.status === 'fulfilled') {
                            else { // if (result.status === 'rejected')
                                throw new Error(result.reason);
                            } // else {                            
                        });  // results.forEach(result=> {
                    }); // .then(results)

            // Update the main places collection.
            updateCollection(MAIN_PLACES, [...mainPlaces, ...newMainPlaces]);

        } catch (error) {
            toast.error(error, toastifyTheme);
        } finally {
            setMainPlacesKey(mainPlacesKey + keyStep);
            setMainPlacesLoaded(true);
            validate();
        } // finally
    } // async function municipalitiesSelected(selectedMunicipalities) {

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

    async function submitData(e) {
    /* Prepare parameters for usage in the search query */
        e.preventDefault();
        if (!validate()) {
            toast.error('Some validation errors occurred! Please check your input and try again.', toastifyTheme);
            return;
        } // if (!validate()) {

        try {
            setQueryComplete(false);
            // Set the shared data between components.
            let selectedProvinces = null;
            selectedProvinces = getSelected(PROVINCES);            
            updateVar(PROVINCES, selectedProvinces); 
    
            let selectedMunicipalities = null;
            selectedMunicipalities = getSelected(MUNICIPALITIES);            
            updateVar(MUNICIPALITIES, selectedMunicipalities);

            let selectedMainPlaces = null;
            selectedMainPlaces = getSelected(MAIN_PLACES);    
            updateVar(MAIN_PLACES, selectedMainPlaces);
    
            let selectedTransTypes = null;
            selectedTransTypes = getSelected(TRANSACTION_TYPES);
            updateVar(TRANSACTION_TYPES, selectedTransTypes);

            let selectedPropTypes = null;
            selectedPropTypes = getSelected(PROPERTY_TYPES);    
            updateVar(PROPERTY_TYPES, selectedPropTypes);
    
            let selectedNumBedrooms = null;
            selectedNumBedrooms = getSelected(NUMBER_OF_BEDROOMS);
            updateVar(NUMBER_OF_BEDROOMS, selectedNumBedrooms);
    
            updateVar(PRICE_FROM, Number.parseFloat(priceFrom));
            updateVar(PRICE_TO, Number.parseFloat(priceTo));
            updateVar(QUERY_TIME, Date.now());
            
            let path = null;

            if (location.pathname === '/search')
                path = '/search/listings';
            else if (location.pathname === '/search/offers') 
                path = '/search/offers/listings';            

            navigate(path);
        } catch (error) {
            console.log(error);
            toast.error(error, toastifyTheme);            
        } finally {
            setQueryComplete(true);
        }

    } // async function submitData(e) {

    useEffect(() => {
        (async()=> {
            if (firstRenderRef.current === false)
                return;

            firstRenderRef.current = false;

            /** This shared variable will be compared to the searchTime compared with the one in the Listings components.
             * If the two are not equal, perform the search query as the search parameters may have changed. */
            if (!varExists(QUERY_TIME))
                addVar(QUERY_TIME, 0);

            try {
                /* Verify if the collections (used for dropdown data) exist. If not, create them. 
                   Existence of Provinces collection implies that all the other collections exists too, as 
                   they are all created at once. */
                if (!collectionExists(PROVINCES)) {
                    setProvincesLoaded(false);
                    let provinces = [];
                    provinces = await getAllProvinces();
                    provinces = provinces.map(doc=> (getSortedObject({...doc, sortField: doc.name})));
    
                    /* NB. When setting the number of selections that the user can make (on the multi-selection dropdowns),
                    we had to make sure they are such that they do not exceed the number of disjunction normalisations in
                    the query created by Firestore does not exceed maximum 30. */
                    addCollection(PROVINCES, provinces, 2);
                    addCollection(MUNICIPALITIES, [], 3);
                    addCollection(MAIN_PLACES, [], 3);
                    setTransactionTypesLoaded(false);
                    addCollection(TRANSACTION_TYPES, transactionTypes, 2, true); // By true, we tell the collectionsContext to add a Primitive data type collection.
                    setPropertyTypesLoaded(false);
                    addCollection(PROPERTY_TYPES, propertyTypes, 2, true);
                    setNumberOfBedroomsLoaded(false);
                    addCollection(NUMBER_OF_BEDROOMS, numberOfBedrooms, 3, true);
                } // if (!collectionExists(PROVINCES)) {            
            } catch (error) {
                toast.error(error, toastifyTheme);
            } finally {
                setProvincesLoaded(true);
                setTransactionTypesLoaded(true);
                setPropertyTypesLoaded(true);
                setNumberOfBedroomsLoaded(true);
            } // finally
            
            try {
                if (!varExists(PROVINCES)) {
                    addVar(PROVINCES, null); // The selected provinces. Null for now.
                    addVar(MUNICIPALITIES, null); // The selected municipalities. Null for now.
                    addVar(MAIN_PLACES, null); // The selected main places to be used in the search. Null for now.
                    addVar(TRANSACTION_TYPES, null); // The selected transaction type. Null for now.
                    addVar(PROPERTY_TYPES, null); // The selected property types.
                    addVar(NUMBER_OF_BEDROOMS, null); // The selected number of bedrooms options.
                    addVar(PRICE_FROM, null);
                    addVar(PRICE_TO, null);
                    addVar(GET_LISTINGS_QUERY_OBJECT, getListingsQueryObject); // This will provide the function to use for querying listings.
                }
                else { 
                    /*  varExists(varName) == true 
                        A scenario where a user returns from the listings page.
                        Check if the user had performed a search before, that is, selections were made in the dropdowns
                        and the Search button clicked, leading to the Listings page.
                    */
                    const selectedProvinces = getVar(PROVINCES);
                    if (selectedProvinces !== null) {  // True when user returns to this page from the listings page.
                        setSelected(PROVINCES, selectedProvinces);
                       await provincesSelected(); // This will effectively retrieve and set the municipalities of the currently selected provinces.
                        
                        const selectedMunicipalities = getVar(MUNICIPALITIES);
                        if (selectedMunicipalities !== null) {  // True when user returns to this page from the listings page.
                            setSelected(MUNICIPALITIES, selectedMunicipalities);
                            await municipalitiesSelected(); // This will effectively retrieve and set the main places of the currently selected municipalities.
                        }

                        const selectedMainPlaces = getVar(MAIN_PLACES);
                        if (selectedMainPlaces !== null)
                            setSelected(MAIN_PLACES, selectedMainPlaces);                                                 
                    } // if (selectedProvinces !== null) {
                    
                    const selectedTransactionTypes = getVar(TRANSACTION_TYPES);
                    if (selectedTransactionTypes !== null)  // True when user returns to this page from the listings page.
                        setSelected(TRANSACTION_TYPES, selectedTransactionTypes);                    
                    
                    const selectedPropertyTypes =  getVar(PROPERTY_TYPES);
                    if (selectedPropertyTypes !== null) // True when user returns to this page from the listings page.
                        setSelected(PROPERTY_TYPES, selectedPropertyTypes);
    
                    const selectedNumBedrooms = getVar(NUMBER_OF_BEDROOMS);
                    if (selectedNumBedrooms !== null) // True when user returns to this page from the listings page.
                        setSelected(NUMBER_OF_BEDROOMS, selectedNumBedrooms);
    
                    const aPriceFrom = getVar(PRICE_FROM);
                    if (aPriceFrom !== null) // True when the user returns to this page from the listings page.
                        setPriceFrom(aPriceFrom);
    
                    const aPriceTo = getVar(PRICE_TO);
                    if (aPriceTo !== null) // True when the user returns to this page from the listings page.
                        setPriceTo(aPriceTo);
                } // else             
            } catch (error) {
                toast.error(error, toastifyTheme);
            } finally {
                setProvincesKey(provincesKey + keyStep);
                setMunicipalitiesKey(municipalitiesKey + keyStep);
                setMainPlacesKey(mainPlacesKey + keyStep);
                setTransactionTypesKey(transactionTypesKey + keyStep);
                setPropertyTypesKey(propertyTypesKey + keyStep);
                setNumberOfBedroomsKey(numberOfBedroomsKey + keyStep);
                validate();
            } // finally
            
        })();
    }, []); // useEffect(() => {

    if (queryComplete === false) {
        return (
            <Loader message='Querying database for listings. Please wait ...' />
        );
    }

    return (
        <div className='w3-container'>
            <form onSubmit={submitData}>
                {provincesLoaded?
                    <div className='w3-margin-top'>
                        <MultiSelectionDropdown2 key={provincesKey} label='* Provinces' collectionName={PROVINCES} keyName='name' valueName='code'
                                                  onItemsSelected={provincesSelected} />
                        {showErrorIcon(PROVINCES)}
                    </div>
                    :
                    <Loader message='Loading provinces ...' />
                }

                {municipalitiesLoaded?
                    <div className='w3-margin-top'>
                        <MultiSelectionDropdown2 key={municipalitiesKey} label='* Municipalities' collectionName={MUNICIPALITIES} keyName='name' valueName='code'
                            onItemsSelected={municipalitiesSelected}/>
                        {showErrorIcon(MUNICIPALITIES)}
                    </div> 
                    :
                    <Loader message='Loading municipalities ...' />
                }

                {mainPlacesLoaded?
                    <div className='w3-margin-top'>
                        <MultiSelectionDropdown2 key={mainPlacesKey} label='* Main Places' collectionName={MAIN_PLACES} keyName='name' valueName='code' />
                        {showErrorIcon(MAIN_PLACES)}
                    </div>
                    :
                    <Loader message='Loading main places ...' />
                }

                {transactionTypesLoaded?
                    <div className='w3-margin-top'>
                        <Dropdown key={transactionTypesKey} label='* Transaction Types' collectionName={TRANSACTION_TYPES} />
                        {showErrorIcon(TRANSACTION_TYPES)}
                    </div>
                    :
                    <Loader message='Loading transaction types ...' />
                }

                {propertyTypesLoaded?
                    <div className='w3-margin-top'>
                        <MultiSelectionDropdown key={propertyTypesKey} label='* Property Types' collectionName={PROPERTY_TYPES} />
                        {showErrorIcon(PROPERTY_TYPES)}
                    </div>
                    :
                    <Loader message='Loading property types ...' />
                }

                {numberOfBedroomsLoaded?
                    <div className='w3-margin-top'>
                        <MultiSelectionDropdown key={numberOfBedroomsKey} label='* Number of Bedrooms' collectionName={NUMBER_OF_BEDROOMS} />
                        {showErrorIcon(NUMBER_OF_BEDROOMS)}
                    </div>
                    :
                    <Loader message='Loading property types ...' />
                }                

                <div className='w3-padding-small'>
                    <label htmlFor='priceFrom'>* Minimum Price</label>
                    <input name='priceFrom' id='priceFrom' auto-complete='off' required={true} aria-required={true} maxLength={50} minLength={2}
                             min={0} className='w3-input w3-input-theme-1' type='number' aria-label='Minimum Price'
                            onChange={e=> handleChange(e)} value={priceFrom}/>
                    {showErrorIcon('priceFrom')}
                </div>
                
                <div className='w3-padding-small'>
                    <label htmlFor='priceTo'>* Maximum Price</label>
                    <input name='priceTo' id='priceTo' auto-complete='off' required={true} aria-required={true} maxLength={50} minLength={2}
                            min={0} className='w3-input w3-input-theme-1' type='number' aria-label='Maximum Price'
                            onChange={e=> handleChange(e)} value={priceTo} />
                    {showErrorIcon('priceTo')}
                </div>
                
                <div className='w3-padding'>
                    <button className='w3-btn w3-margin-small w3-theme-d5 w3-round' type='submit'>Search</button>
                </div>
                
            </form>

            <ToastContainer/>
        </div>
    );
}

export default SearchListings;
