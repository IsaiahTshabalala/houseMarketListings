/**
 * File: ./src/components/SearchListings.js
 * Description:
 * Facilitate searching of listings.
 * 
 * Start Date   End Date     Dev  Version  Description
 * 2024/01/11                ITA  1.00     Genesis.
 * 2024/05/01                ITA  1.01     Add header comment. Update the paths.
 * 2024/07/04                ITA  1.02     Remove the use of getSortedObject function, since the equality tests in the Collections provider now use proper comparison functions,
 *                                         and not the comparison of JSON stringified objects.
 *                                         In keeping with the improved sorting mechanism in the CollectionsProvider, eliminate the sortField and instead use place names for sorting.
 * 2024/07/14                ITA  1.03     User to select prices via a dropdown, no longer to type the minimum and maximum prices.
 * 2024/08/07                ITA  1.04     The price ranges collection must be created as an array of objects, each with price range and index as properties.
 * 2024/08/14                ITA  1.05     Enhance the way prices (priceFrom and priceTo) values are ob137ained from the selected price range, in keeping with the updated currency formatting.
 * 2024/08/15                ITA  1.05     Replace ZAR with R.
 * 2024/08/18                ITA  1.06     Import context directly. Variable names moved to VarNames object.
 *                           ITA  1.07     Property types, number of bedrooms, municipalities and main places are now optional filters.
 *                                         Component to call (notify) a parent component provided function after search data has been submitted.
 * 2024/10/28                ITA  1.08     Remove the divs around the Filters and Search buttons. Not necessary.   
 * 2026/01/05   2026/01/02   ITA  1.09     useCollectionsContext() removed. Dropdowns no longer use it.
 *                                         Dropdowns now imported from 'dropdowns-js' where they were moved and refined.
 */
import { useEffect, useState } from 'react';
import { RiArrowDropUpLine, RiArrowDropDownLine } from "react-icons/ri";
import { BiFilter } from 'react-icons/bi';
import 'dropdowns-js/style.css';
import { dropdownStyle, buttonStyle } from './dropdownStyles';
import { useSharedVarsContext } from '../hooks/SharedVarsProvider';
import { ToastContainer, toast } from 'react-toastify';
import FieldError from './FieldError';
import { Dropdown, DropdownObj, MultiSelectionDropdown, MultiSelectionDropdownObj } from 'dropdowns-js';
import { getAllProvinces, getMunicipalitiesOfTheProvinces, getMainPlacesOfTheMunicipalities,
         transactionTypes, propertyTypes, numberOfBedrooms, VarNames, salesPriceRanges, rentalPriceRanges,
         QueryNames } from '../utilityFunctions/firestoreComms';
import { func } from 'prop-types';         
import Loader from './Loader';
import toastifyTheme from './toastifyTheme';
import { toZarCurrencyFormat } from 'some-common-functions-js';
import { hasValues } from '../utilityFunctions/commonFunctions';

function SearchListings({
    notify = null // Call back function to tell the parent component that data has been submitted (search botton clicked).
}) {
    const [expanded, setExpanded] = useState(false);
    const [provinces, setProvinces] = useState([]);
    const [selectedProvinces, setSelectedProvinces] = useState([]);
    const [municipalities, setMunicipalities] = useState([]);
    const [selectedMunicipalities, setSelectedMunicipalities] = useState([]);
    const [mainPlaces, setMainPlaces] = useState([]);
    const [selectedMainPlaces, setSelectedMainPlaces] = useState([]);
    const [selectedTransType, setSelectedTransType] = useState('');
    const [selectedPropTypes, setSelectedPropTypes] = useState([]);
    const [priceRanges, setPriceRanges] = useState([]);
    const [selectedPriceRange, setSelectedPriceRange] = useState(null);
    const [selectedNumBedrooms, setSelectedNumBedrooms] = useState([]);

    const { addVar, updateVar, varExists, getVar } = useSharedVarsContext();
    const [payRate, setPayRate] = useState('');

    /**To set to false while the data of the respective dropdowns is being loaded, set to true thereafter. */
    const [provincesLoaded, setProvincesLoaded] = useState(true);
    const [municipalitiesLoaded, setMunicipalitiesLoaded] = useState(true);
    const [mainPlacesLoaded, setMainPlacesLoaded] = useState(true);
    const [queryComplete, setQueryComplete] = useState(true);
    const [offersOnly, setOffersOnly] = useState(false);
    const [numFilters, setNumFilters] = useState(0);
    const [errors, setErrors] = useState({});

    /** Validate user input. To be called when the user submits data. */
    function validate() {
        const errorList = {};
        let count = 0;
        let locPriceRanges;
        // Mandatory fields:
        // Check whether any transaction types were selected.
        if (!selectedTransType)
            errorList[VarNames.TRANSACTION_TYPES] = 'No transaction type selected!';
        else {
            count++;
            locPriceRanges = (selectedTransType === 'Sale')? salesPriceRanges : rentalPriceRanges;
        }

        // Check whether a price range was selected.
        if (!selectedPriceRange)
            errorList[VarNames.PRICE_RANGES] = 'No price range selected!';
        else if (!locPriceRanges.some(priceRange=> priceRange === selectedPriceRange.priceRange)) // selectedPriceRange = { priceRange, index }
            errorList[VarNames.PRICE_RANGES] = 'Invalid price range';
        else
            count++;

        // Check whether any provinces were selected.
        if (selectedProvinces.length === 0) // No province selected.
            errorList[VarNames.PROVINCES] = 'No provinces selected!';
        else
            count++;
        
        // Optional fields:
        // Check whether any property types were selected.
        if (selectedPropTypes.length > 0)
            count++;
        
        // Check whether any municipalities were selected.
        if (selectedMunicipalities.length > 0) {
            const invalidMunicipalities = selectedMunicipalities.filter(selMunicipality=> {
                return selectedProvinces
                        .some(prov=> (prov.code === selMunicipality.provincialCode)) === false;
            });
            if (invalidMunicipalities.length > 0)
                errorList[VarNames.MUNICIPALITIES] = `${invalidMunicipalities[0].name} not found in the selected provinces`;
            else
                count++;
        }

        // Check whether any main places were selected.
        if (selectedMainPlaces.length > 0) {
            const invalidMainPlaces = selectedMainPlaces.filter(selMainPlace=> {
                return selectedMunicipalities
                        .some(selMunicipality=>
                            ((selMunicipality.provincialCode === selMainPlace.provincialCode)
                                && (selMunicipality.code === selMainPlace.municipalityCode)
                            )
                        ) === false;
            });
            if (invalidMainPlaces.length > 0)
                errorList[VarNames.MAIN_PLACES] = `${invalidMainPlaces[0].name} not found in the selected municipalities.`;
            else
                count++;
        }

        // Check whether any number of bedrooms were selected.
        if (selectedNumBedrooms.length > 0)
            count++;

        if (offersOnly)
            count++;

        setNumFilters(count);
        setErrors(errorList);
        console.log(errorList);
        return (!hasValues(errorList));
    } // function validate() {

    /** Update the provinces according to what has been selected in the multi-selection dropdown.
     * Also update the municipalities and their respective main places in keeping up with the currently selected provinces.*/
    async function provincesSelected(selProvinces) {
        setSelectedProvinces(selProvinces); // Set selected municipalities to the ones selected in the dropdown.
        updateVar(VarNames.PROVINCES, [...selProvinces]);

        // Get the previously loaded municipalities that belong to the currently selected provinces.
        let prevMunicipalities = municipalities.filter(municipality=> {
            return selProvinces.some(province=> {
                return province.code === municipality.provincialCode;
            });
        });

        // Get the previously loaded main places that belong to the currently selected provinces.
        let  prevMainPlaces = mainPlaces.filter(mainPlace=> {
            return selProvinces.some(province=> {
                return province.code === mainPlace.provincialCode;
            });
        });
            
        // Get the newly loaded provinces (with no municipalities previously loaded for them).
        const newProvinces = selProvinces.filter(province=> {
            return prevMunicipalities.some(municipality=> {
                return municipality.provincialCode === province.code;
            }) === false;
        });
        const newProvincialCodes = newProvinces.map(province=> province.code);

        try {
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
                                    // Add provinceName and municipalityName as sort fields.
                                    return  {
                                                ...item,
                                                provinceName: aProvince.name
                                            };
                                });
                                newMunicipalities = [...newMunicipalities, ...municipalitiesResult];
                            }
                            else { // if (result.status === 'rejected')'
                                throw new Error(result.reason);
                            }
                        })
                    });

            // Update the municipalities and mainplaces for the dropdowns.
            const updatedMunicipalities = [...prevMunicipalities, ...newMunicipalities];
            setMunicipalities(updatedMunicipalities);

            // Eliminate from the selected municipalities, those that no longer belong to any of the currently selected provinces.
            const selMunicipalities = selectedMunicipalities.filter(selMunicipality=> {                
                return selProvinces.some(province=> (province.code === selMunicipality.provincialCode));
            });
            setSelectedMunicipalities(selMunicipalities);

            // Update the main places state according to the currently selected provinces.
            setMainPlaces(prevMainPlaces);

            // Eliminate from the selected main places, those that no longer belong to any of the currently selected provinces.
            const selMainPlaces = selectedMainPlaces.filter(selMainPlace=> {
                return selProvinces.some(province=> (province.code === selMainPlace.provincialCode));
            });
            setSelectedMainPlaces(selMainPlaces);
        } catch (error) {
            console.log(error);
            toast.error(error, toastifyTheme);
        } finally {
            setMunicipalitiesLoaded(true);
        } // finally
    } // async function provincesSelected()

    async function municipalitiesSelected(selMunicipalities) {
        console.log('municipalitiesSelected', selMunicipalities);
        // Set the selected municipalities to the municipalities currently selected in the multi-selection dropdown.
        setSelectedMunicipalities(selMunicipalities);
        try {
            // Get the previously loaded main places whose municipalities are currently selected.----------------------------------------
            const prevMainPlaces = mainPlaces.filter(mainPlace=> {
                return selMunicipalities.some(municipality=> {
                    return municipality.provincialCode === mainPlace.provincialCode
                            && municipality.code === mainPlace.municipalityCode;
                });
            });

            // Get the newly selected municipalities (they have no main places loaded for them)
            const newMunicipalities = selMunicipalities.filter(municipality=> {
                return prevMainPlaces.some(mainPlace=> {
                    return mainPlace.provincialCode === municipality.provincialCode
                            && mainPlace.municipalityCode === municipality.code
                }) === false;
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

                                    let tempProvinces = selectedProvinces;
                                    if (tempProvinces.length === 0) // Provinces not loaded yet.
                                        tempProvinces = [...getVar(VarNames.PROVINCES)];
                                    
                                    const aProvince = tempProvinces.find(province=> {
                                        return province.code === mainPlacesResult[0].provincialCode;
                                    });
                                    // Add the sort field each result array element.
                                    mainPlacesResult = mainPlacesResult.map(aMainPlace=> {                                
                                        return {
                                            ...aMainPlace,
                                            provinceName: aProvince.name,
                                            municipalityName: aMunicipality.name
                                        };
                                    });
                                    newMainPlaces = [...newMainPlaces, ...mainPlacesResult];  
                                } // if (mainPlacesResult.length > 0) {                     
                            } // if (result.status === 'fulfilled') {
                            else { // if (result.status === 'rejected')                                
                                throw new Error(result.reason);
                            } // else {                            
                        });  // results.forEach(result=> {
                    }); // .then(results)

            // Update the main places.
            const updatedMainPlaces = [...prevMainPlaces, ...newMainPlaces];
            setMainPlaces(updatedMainPlaces);

            // Eliminate from the selected main places, those that do not belong to the currently selected municipalities.
            const selMainPlaces = selectedMainPlaces.filter(selMainPlace=> {
                return selMunicipalities.some(selMunicipality=> (
                    (selMunicipality.code === selMainPlace.municipalityCode)
                    && (selMunicipality.provincialCode === selMainPlace.provincialCode)
                ));
            });
            setSelectedMainPlaces(selMainPlaces);
        } catch (error) {
            console.log(error);
            toast.error(error, toastifyTheme);
        } finally {
            setMainPlacesLoaded(true);
        } // finally
    } // async function municipalitiesSelected(selectedMunicipalities) {

    function mainPlacesSelected(selMainPlaces) {
        setSelectedMainPlaces(selMainPlaces);
    }
    
    /**Whenever a transaction type (sale/rent) is selected, re-load the approriate price ranges (sale/rent).
     */
    function transactionTypeSelected(selTransType) {
        setSelectedTransType(selTransType);

        let prices;
        if (selTransType === 'Sale') { // Load sales price ranges in the price ranges dropdown.
            prices = salesPriceRanges;
            setPayRate('');
        } // if (transactionType === 'Sale')
        else if (selTransType === 'Rent') {
            prices = rentalPriceRanges;
            setPayRate(' / month');
        } // else if (transactionType === 'Rent')
        // Create an array of objects, each with a price range and index. So that the index may be used for sorting, inside the dropdown.
        prices = prices.map((priceRange, index)=> ({ priceRange, index }));
        setPriceRanges(prices);
    } // function transactionTypeSelected()

    function propTypesSelected(selPropTypes) {
        setSelectedPropTypes(selPropTypes);
    }

    function priceRangeSelected(selPriceRange) {
        setSelectedPriceRange(selPriceRange);
    }

    function numBedroomsSelected(selNumBedrooms) {
        setSelectedNumBedrooms(selNumBedrooms);
    }

    function handleOffersOnlyChanged() {
        setOffersOnly(!offersOnly);
    }

    function handleFilterButtonClicked() {
        validate();
        setExpanded(!expanded);
    }

    async function submitData(e) {
    /* Prepare parameters for usage in the search query */
        e.preventDefault();
        if (!validate()) {
            toast.error('Some validation errors occurred! Please check your filters and try again.', toastifyTheme);
            return;
        } // if (!validate()) {

        try {
            let newKey = '';
            setQueryComplete(false);
            // Set the shared data between components.
            if (!varExists(VarNames.QUERY_NAME))
                addVar(VarNames.QUERY_NAME, QueryNames.FILTERED_LISTINGS);
            else
                updateVar(VarNames.QUERY_NAME, QueryNames.FILTERED_LISTINGS);

            updateVar(VarNames.PROVINCES, [...selectedProvinces]);
            selectedProvinces.forEach(province=> newKey += province.code + "|");

            updateVar(VarNames.MUNICIPALITIES, [...selectedMunicipalities]);
            selectedMunicipalities.forEach(municipality=> newKey += municipality.code + "|");

            updateVar(VarNames.MAIN_PLACES, [...selectedMainPlaces]);
            selectedMainPlaces.forEach(mainPlace=> newKey += mainPlace.code + "|");

            updateVar(VarNames.TRANSACTION_TYPES, [selectedTransType]);
            newKey += selectedTransType + "|";

            updateVar(VarNames.PROPERTY_TYPES, [...selectedPropTypes]);
            selectedPropTypes.forEach(propType=> newKey += propType + "|");

            updateVar(VarNames.NUMBER_OF_BEDROOMS, [...selectedNumBedrooms]);
            selectedNumBedrooms.forEach(numBedrooms=> newKey += numBedrooms + "|");
    
            // priceRange example: 'R2,000.00 to R3,000.00' or '5,000 +'
            let selPriceRange = selectedPriceRange.priceRange.replace(/(R|,|\s|\+)/gi, '');
            selPriceRange = selPriceRange.split('to');

            let priceFrom = selPriceRange[0];
            priceFrom = Number.parseFloat(priceFrom);
            newKey += priceFrom + "|";

            let priceTo = selPriceRange.length > 1? selPriceRange[1] : null;
            if (priceTo) { // not null
                priceTo = Number.parseFloat(priceTo);
                newKey += priceTo + "|";
            }
            updateVar(VarNames.PRICE_FROM, priceFrom);
            updateVar(VarNames.PRICE_TO, priceTo);

            updateVar(VarNames.OFFERS_ONLY, offersOnly);
            newKey += offersOnly;
            if (!varExists(VarNames.LISTINGS_KEY))
                addVar(VarNames.LISTINGS_KEY, newKey);
            updateVar(VarNames.LISTINGS_KEY, newKey);

            setExpanded(false);
            if (notify !== null) {
                notify();
            }
        } catch (error) {
            console.log(error);
            toast.error(error, toastifyTheme);
        } finally {
            setQueryComplete(true);
        } // finally {
    } // async function submitData(e) {

    useEffect(() => {
        (async()=> {
            try {
                /* Ensure to load the provinces dropdown data. */
                if (provinces.length === 0) {
                    setProvincesLoaded(false);
                    setProvinces(await getAllProvinces());
                } // if (!collectionExists(VarNames.PROVINCES)) {
            } catch (error) {
                toast.error(error, toastifyTheme);
            } finally {
                setProvincesLoaded(true);
            } // finally
            
            try {                
                /*  varExists(varName) == true 
                    A scenario where a user returns from the listings page.
                    Check if the user had performed a search before, that is, selections were made in the dropdowns
                    and the Search button clicked, leading to the Listings page.
                */
                let selProvinces = [];
                if (varExists(VarNames.PROVINCES)) {
                    selProvinces = [...getVar(VarNames.PROVINCES)];
                    if (selProvinces.length > 0)  // True when user returns to this page from the listings page.
                        await provincesSelected(selProvinces); // This will effectively set the selected provinces and set the municipalities of the currently selected provinces.
                }
                else
                    addVar(VarNames.PROVINCES, selProvinces);

                let selMunicipalities = [];
                if (varExists(VarNames.MUNICIPALITIES)) {
                    selMunicipalities = [...getVar(VarNames.MUNICIPALITIES)];
                    console.log('useEffectMunicipalities', selMunicipalities);
                    if (selMunicipalities.length > 0) // True when user returns to this page from the listings page.
                        await municipalitiesSelected(selMunicipalities); // This will effectively set the selected municipalities and set the main places of the currently selected municipalities.
                }
                else
                    addVar(VarNames.MUNICIPALITIES, selMunicipalities);

                let selMainPlaces = [];
                if (varExists(VarNames.MAIN_PLACES)) {
                    selMainPlaces = [...getVar(VarNames.MAIN_PLACES)];
                    console.log('useEffectMainPlaces', selMainPlaces);
                    if (selMainPlaces.length > 0)
                        mainPlacesSelected(selMainPlaces); // set selected main places.
                }
                else
                    addVar(VarNames.MAIN_PLACES, selMainPlaces);


                let selTransTypes = [];
                if (varExists(VarNames.TRANSACTION_TYPES))
                    selTransTypes = [...getVar(VarNames.TRANSACTION_TYPES)];
                else
                    addVar(VarNames.TRANSACTION_TYPES, selTransTypes);

                const selTransType = (selTransTypes.length > 0)? selTransTypes[0] : null;

                let aPriceFrom = null,
                    aPriceTo = null;
                
                if (varExists(VarNames.PRICE_FROM))
                    aPriceFrom = getVar(VarNames.PRICE_FROM);
                else
                    addVar(VarNames.PRICE_FROM, aPriceFrom);

                if (varExists(VarNames.PRICE_TO))
                    aPriceTo = getVar(VarNames.PRICE_TO);
                else
                    addVar(VarNames.PRICE_TO, aPriceTo);

                let selPropTypes = [];
                if (varExists(VarNames.PROPERTY_TYPES))
                    selPropTypes = [...getVar(VarNames.PROPERTY_TYPES)];
                else
                    addVar(VarNames.PROPERTY_TYPES, selPropTypes);

                if (selPropTypes.length > 0) // True when user returns to this page from the listings page.
                    propTypesSelected(selPropTypes);
                
                let selNumBedrooms = [];
                if (varExists(VarNames.NUMBER_OF_BEDROOMS))
                    selNumBedrooms = [...getVar(VarNames.NUMBER_OF_BEDROOMS)];
                if (selNumBedrooms.length > 0) // True when user returns to this page from the listings page.
                    numBedroomsSelected(selNumBedrooms); // set selected number of bedroom options.

                let offers = false;
                if (varExists(VarNames.OFFERS_ONLY))
                    offers = getVar(VarNames.OFFERS_ONLY);
                else
                    addVar(VarNames.OFFERS_ONLY, offers);

                if (selTransType) { // True when user returns to this page from the listings page.
                    transactionTypeSelected(selTransType);
                    let tempPriceRanges = (()=> {
                        switch (selTransType) {
                            case 'Sale':
                                return salesPriceRanges;
                            case 'Rent':
                                return rentalPriceRanges;
                            default:
                                return null;
                        }
                    })();

                    if (tempPriceRanges) {
                        let selPriceRange;
                        if (aPriceFrom !== null && aPriceTo !== null) {
                            tempPriceRanges = tempPriceRanges.map((priceRange, index)=> ({priceRange, index}));
                            selPriceRange = tempPriceRanges.find((range)=> {
                                const result = range.priceRange.includes(toZarCurrencyFormat(aPriceFrom))
                                        && range.priceRange.includes(toZarCurrencyFormat(aPriceTo));
                                return result;
                            });
                        }
                        else if (aPriceFrom !== null) // aPriceTo is null
                            selPriceRange = tempPriceRanges.find(range=> {
                                return range.priceRange.includes(toZarCurrencyFormat(aPriceFrom) + ' +');
                            });
                        
                        if (selPriceRange)
                            priceRangeSelected(selPriceRange); // Set selected price range.
                    }
                }
                setOffersOnly(offers);
            } catch (error) {
                console.log(error);
                toast.error(error, toastifyTheme);
            } finally {
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
        <>
            <div className='w3-container'>
                <div className='w3-margin-top'>
                    <button className='w3-btn w3-theme-d5 w3-round side-by-side w3-margin-right' type='button' onClick={e=> handleFilterButtonClicked()}>
                        Filters ({numFilters}) {!expanded? <RiArrowDropDownLine className='w3-large'/> : <RiArrowDropUpLine className='w3-large'/>}
                    </button>
                    <form className='side-by-side w3-margin-top' onSubmit={submitData}>
                        <button className='w3-btn w3-margin-small w3-theme-d5 w3-round' type='submit'>Apply <BiFilter/></button>
                    </form>
                </div>
                {expanded &&
                    <>
                        <div className='w3-margin-top'>
                            { /* Default sort order: 'asc' */}
                            <Dropdown
                                label='Transaction Types'
                                data={transactionTypes}
                                onItemSelected={transactionTypeSelected}
                                selected={selectedTransType}
                                dropdownStyle={dropdownStyle}
                            />
                            <FieldError error={errors[VarNames.TRANSACTION_TYPES]} />
                        </div>

                        <div className='w3-margin-top w3-padding-small'>
                            <input type='checkbox' name='offersOnly' checked={offersOnly} onChange={handleOffersOnlyChanged}/>
                            <label htmlFor='offersOnly'> Offers only</label>
                        </div>

                        <div className='w3-margin-top'>
                            <DropdownObj
                                label={`Price ${payRate}`}
                                data={priceRanges}
                                displayName='priceRange'
                                valueName='priceRange'
                                onItemSelected={priceRangeSelected}
                                selected={selectedPriceRange}
                                sortFields={['index']}
                                dropdownStyle={dropdownStyle}
                                buttonStyle={buttonStyle}
                            />
                            <FieldError error={errors[VarNames.PRICE_RANGES]} />
                        </div>                        
                        
                        <div className='w3-margin-top'>
                            { /*Default sort order */}
                            <MultiSelectionDropdown
                                label='Property Types'
                                data={propertyTypes}
                                selectedData={selectedPropTypes}
                                maxNumSelections={2}
                                onItemsSelected={propTypesSelected}                                
                                dropdownStyle={dropdownStyle}
                                buttonStyle={buttonStyle}
                            />
                            <FieldError error={errors[VarNames.PROPERTY_TYPES]}/>
                        </div>

                        <div className='w3-margin-top'>
                            <MultiSelectionDropdown
                                label='Number of Bedrooms'
                                data={numberOfBedrooms}
                                maxNumSelections={3}
                                selectedData={selectedNumBedrooms}
                                onItemsSelected={numBedroomsSelected}
                                dropdownStyle={dropdownStyle}
                                buttonStyle={buttonStyle}
                            />
                            <FieldError error={errors[VarNames.NUMBER_OF_BEDROOMS]} />
                        </div>

                        {
                            /* NB. When setting the number of selections that the user can make (on the multi-selection dropdowns),
                               care was made to ensure that such that they do not exceed the number of disjunction normalisations in
                               the query created by Firestore does not exceed maximum 30. */
                        }
                        {provincesLoaded?
                            <div className='w3-margin-top'>
                                <MultiSelectionDropdownObj
                                    label='Provinces'
                                    data={provinces}
                                    displayName='name'
                                    valueName='code'
                                    sortFields={['name', 'code']}
                                    onItemsSelected={provincesSelected}
                                    selectedData={selectedProvinces}
                                    maxNumSelections={2}
                                    dropdownStyle={dropdownStyle}
                                    buttonStyle={buttonStyle}
                                />
                                <FieldError error={errors[VarNames.PROVINCES]} />
                            </div>
                            :
                            <Loader message='Loading provinces ...' />
                        }

                        {municipalitiesLoaded?
                            <div className='w3-margin-top'>
                                <MultiSelectionDropdownObj
                                    label='Municipalities'
                                    data={municipalities}
                                    displayName='name'
                                    valueName='code'
                                    onItemsSelected={municipalitiesSelected}
                                    selectedData={selectedMunicipalities}
                                    maxNumSelections={3}
                                    sortFields={['provinceName', 'name']}
                                    dropdownStyle={dropdownStyle} buttonStyle={buttonStyle}
                                />
                                <FieldError error={errors[VarNames.MUNICIPALITIES]}/>
                            </div> 
                            :
                            <Loader message='Loading municipalities ...' />
                        }
                        
                        {mainPlacesLoaded?
                            <div className='w3-margin-top'>
                                <MultiSelectionDropdownObj
                                    label='Main Places'
                                    data={mainPlaces}
                                    onItemsSelected={mainPlacesSelected}
                                    selectedData={selectedMainPlaces}
                                    maxNumSelections={3}
                                    displayName='name'
                                    valueName='code'
                                    sortFields={['provinceName', 'municipalityName', 'name']}
                                    dropdownStyle={dropdownStyle} buttonStyle={buttonStyle}
                                />
                                <FieldError error={errors[VarNames.MAIN_PLACES]} />
                            </div>
                            :
                            <Loader message='Loading main places ...' />
                        }

                        
                        <div className='w3-margin-top'>
                            <button className='w3-btn w3-theme-d5 w3-round side-by-side w3-margin-right' type='button' onClick={e=> handleFilterButtonClicked()}>
                                Filters ({numFilters}) {!expanded? <RiArrowDropDownLine className='w3-large'/> : <RiArrowDropUpLine className='w3-large'/>}
                            </button>
                            <form className='side-by-side w3-margin-top' onSubmit={submitData}>
                                <button className='w3-btn w3-margin-small w3-theme-d5 w3-round' type='submit'>Apply <BiFilter/></button>
                            </form>
                        </div>
                    </>
                }

                <ToastContainer/>
            </div>
        </>
    );
}

SearchListings.propTypes = {
    notify: func
};

export default SearchListings;