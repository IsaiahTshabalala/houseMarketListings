/**
 * File: '../src/components/Listings.js'
 * Purpose: Display thumbnails of listings.
 * 
 * Date         Dev  Version  Description
 * 2024/01/27   ITA  1.00     Genesis.
 * 2024/01/28   ITA  1.01     Tweak the useEffect to render the listings consistently. Add pagination.
 * 2024/07/01   ITA  1.02     QueryTypes object renamed to FetchTypes. Its properties also renamed.
 *                            Check previous url locations as to whether data must be reloaded when this page loads.
 *                            In the Firestore listener (onSnapshot), make use of the binarySearchObj function to help
 *                            add new listings at the right position on the listings array.
 *                            Remove the use of function getSortedObject. It is not necessary.
 * 2024/07/14   ITA  1.03     Maximum number of documents fetched from Firestore settable in the environment variables. Default: 10.
 */
import { useState, useRef, useEffect, useContext, memo } from 'react';
import { CLICKED_LISTING, GET_LISTINGS_QUERY_OBJECT, PROVINCES, MUNICIPALITIES,
         MAIN_PLACES, SUB_PLACES, TRANSACTION_TYPES, PROPERTY_TYPES,
         NUMBER_OF_BEDROOMS, PRICE_FROM, PRICE_TO,
         getProvince, getMunicipality, getMainPlace, getSubPlace,
         LISTINGS, FetchTypes, getDocumentSnapshot} from '../utilityFunctions/firestoreComms';
import { onSnapshot, getDocs } from 'firebase/firestore';
import { toZarCurrencyFormat, binarySearchObj, objCompare } from '../utilityFunctions/commonFunctions';
import { sharedVarsContext } from '../hooks/SharedVarsProvider';
import { FaBed, FaBath, FaRulerCombined, FaCar, FaLandmark } from "react-icons/fa";
import { GiHomeGarage } from "react-icons/gi";
import { NavLink, useNavigate, useLocation, useParams } from 'react-router-dom';
import Loader from './Loader';
import { userContext } from '../hooks/UserProvider';
import { locationsContext } from '../hooks/LocationsProvider';
import { w3ThemeD5, selectedItemStyle } from './moreStyles.js';

function Listings() {
    const { getVar, addVar, updateVar, varExists} = useContext(sharedVarsContext);
    const { currentUser } = useContext(userContext);
    const [listings, setListings] = useState([]);
    const [listingsLoaded, setListingsLoaded] = useState(true);
    const firstRenderRef = useRef(true);
    
    const lastDocRef = useRef(null); /**The last fetched document from Firestore.*/
    const unsubscribeRef = useRef(null);  /**Will store an object to listen to Firestore fetched documents and update should there
                                             be changes to those documents in Firestore.*/
    const navigate = useNavigate();
    const {getLocations} = useContext(locationsContext); // Get the recent urls that the user browsed including the current.
    const location = useLocation();
    const params = useParams();
    const numDocsToFetch = (()=> {
                                let numDocs = Number.parseInt(process.env.REACT_APP_NUM_DOCS_TO_FETCH);
                                if (numDocs === undefined)
                                    numDocs = 10;
                                else
                                    numDocs = Number.parseInt(numDocs);
                                return numDocs;
                            })();

    const [numPages, setNumPages] = useState(1);
    const [pageNum, setPageNum] = useState(1);
    const currLocation = location.pathname;
    const PAGE_NUM = 'pageNumber';

    const sortFields = (()=> {
        if  (currLocation === '/search/all/listings'
            || currLocation === '/search/offers/listings'
            || currLocation.startsWith('/explore/'))
            return ['listingId asc'];  // Fetched listings expected to be sorted by listingId.
        else if (currLocation === '/my-profile/listings')
            return ['dateCreated desc', 'listingId desc']; // Fetched listings expected to be sorted by dateCreated, then listingId.
        else
            return [];
    })();

    const backTo = (()=> {
        let returnTo = {
            link: '#',
            text: ''
        };

        if (currLocation === '/search/all/listings') {
            returnTo = {
                link: '/search/all',
                text: 'Back to Search All Listings'
            };
        }
        else if (currLocation === '/search/offers/listings') {
            returnTo = {
                link: '/search/offers',
                text: 'Back to Search for Offers'
            };
        }
        else if (currLocation === `/explore/${params.provincialCode}/${params.municipalityCode}/${params.mainPlaceCode}`) {
            returnTo = {
                link: `/explore/${params.provincialCode}`,
                text: 'Back to Explore Listings'
            };
        }
        return returnTo;
    })();

    function setPagination(numListings) {
        let pageCount = Math.ceil(numListings * 1.00 / numDocsToFetch);
        setNumPages(pageCount);

        if (pageNum > pageCount)
            setPageNum(pageCount);
    } // function setPagination(numListings) {

    function generateSeqArray(count) {
        // Generate an array of a page numbers {1, 2, 3, ... count}
        const anArray = [];
        for (let cnt = 1; cnt <= count; cnt++)
            anArray.push(cnt);

        return anArray;
    } // function generateSeqArray(count) {

    function goToListing(listing) {
        if (listing === null)
            return;

        updateVar(CLICKED_LISTING, listing);
        updateVar(PAGE_NUM, pageNum);
        navigate(`${currLocation}/${listing.listingId}`);
    } // function goToListing(listing) {

    async function createQuery(fetchType = null) {
        const location = getLocations()[0]; // Current location (url)
        let qry = null;
        const functionGetQueryObject = getVar(GET_LISTINGS_QUERY_OBJECT);

        if (location === `/my-profile/listings`) {
            if (fetchType === FetchTypes.START_AFTER_DOC)
                qry = functionGetQueryObject(currentUser.authCurrentUser.uid, numDocsToFetch,
                                             lastDocRef.current, fetchType);
            else if (fetchType === FetchTypes.END_AT_DOC)
                qry = functionGetQueryObject(currentUser.authCurrentUser.uid, null, lastDocRef.current, fetchType);
            else
                qry = functionGetQueryObject(currentUser.authCurrentUser.uid, numDocsToFetch);
        }
        else if (['/search/all/listings', '/search/offers/listings'].includes(location)) {
            /**Shared vars must have been provided via the SearchListings component. */
            if (varExists(MAIN_PLACES)) {
                const mainPlaces = getVar(MAIN_PLACES);
                const transactionTypes = getVar(TRANSACTION_TYPES);
                const propertyTypes = getVar(PROPERTY_TYPES);
                const numberOfBedrooms = getVar(NUMBER_OF_BEDROOMS);

                if (location === '/search/offers/listings') {
                    if (fetchType === FetchTypes.START_AFTER_DOC) // Create a query for fetching data.
                        qry = functionGetQueryObject(mainPlaces, transactionTypes, 
                                                     propertyTypes, numberOfBedrooms,
                                                     true, numDocsToFetch, lastDocRef.current, fetchType);
                    else if (fetchType === FetchTypes.END_AT_DOC) // Create a query for listening.                   
                        qry = functionGetQueryObject(mainPlaces, transactionTypes, 
                                                     propertyTypes, numberOfBedrooms,
                                                     true, null, lastDocRef.current, fetchType);
                    else                 
                        qry = functionGetQueryObject(mainPlaces, transactionTypes, 
                                                    propertyTypes, numberOfBedrooms,
                                                    true, numDocsToFetch);
                        
                } // if (location === '/listings/offers')
                else {
                    if (fetchType === FetchTypes.START_AFTER_DOC)
                        qry = functionGetQueryObject(mainPlaces, transactionTypes, 
                                                     propertyTypes, numberOfBedrooms,
                                                     false, numDocsToFetch, lastDocRef.current, fetchType);
                    else if (fetchType === FetchTypes.END_AT_DOC)
                        qry = functionGetQueryObject(mainPlaces, transactionTypes, 
                                                     propertyTypes, numberOfBedrooms,
                                                    false, null, lastDocRef.current, fetchType);
                    else // fetchType === null
                        qry = functionGetQueryObject(mainPlaces, transactionTypes, 
                                                    propertyTypes, numberOfBedrooms,
                                                    false, numDocsToFetch);
                    
                } // else

            } // if (varExists(MAIN_PLACES))
        } // else if (['/listings', '/listings/offers'].includes(location)) {
        else if (location.startsWith('/explore/')) {
            const provincialCode = params.provincialCode;
            const municipalityCode = params.municipalityCode;
            const mainPlaceCode = params.mainPlaceCode;

            if (provincialCode !== undefined && municipalityCode !== undefined && mainPlaceCode !== undefined) {
                if (fetchType === FetchTypes.START_AFTER_DOC)
                    qry = functionGetQueryObject(provincialCode, municipalityCode, 
                                                 mainPlaceCode, numDocsToFetch,
                                                 lastDocRef.current, fetchType);
                else if (fetchType === FetchTypes.END_AT_DOC)
                    qry = functionGetQueryObject(provincialCode, municipalityCode, 
                                                 mainPlaceCode, null,
                                                 lastDocRef.current, fetchType);
                else                    
                    qry = functionGetQueryObject(provincialCode, municipalityCode, 
                                                 mainPlaceCode, numDocsToFetch,
                                                 lastDocRef.current, fetchType);
            } // if (provincialCode !== undefined && municipalityCode !== undefined && mainPlaceCode !== undefined ...
        }
        return qry;
    } // async function createQuery() {

    async function recreateQueryListener() {
        // Create a listener to listen for listing updates in Firestore.
        // First unsubscribe to the current listener if it exists.
        if (unsubscribeRef.current !== null)
            unsubscribeRef.current();

        if (lastDocRef.current === null) // No listings so far. Nothing to listen to.
            return;
        
        const qry = await createQuery(FetchTypes.END_AT_DOC);
        let priceFrom = null,
            priceTo = null;
        
        if (varExists(PRICE_FROM))
            priceFrom = getVar(PRICE_FROM);
        if (varExists(PRICE_TO))
            priceTo = getVar(PRICE_TO);

        unsubscribeRef.current = onSnapshot(
                                    qry, 
                                    async snapshot=> {
                                        setListingsLoaded(false);
                                        let theListings = [...getVar(LISTINGS)];
                                        const changes = snapshot.docChanges();
                                        for (let index1 in changes) {
                                            const change = changes[index1];
                                            const aDoc = change.doc.data();
                                            aDoc.dateCreated = aDoc.dateCreated.toDate();
                                            aDoc.listingId = change.doc.id;
                                            const index2 = binarySearchObj(theListings, aDoc, 0, ...sortFields); // sortFields are comparison fields.
                                            let comparison = objCompare(aDoc, theListings[index2], ...sortFields);
                                            if (change.type === 'removed') {
                                                if (comparison === 0) {
                                                    theListings.splice(index2, 1);                      
                                                }
                                                continue;
                                            } // if (change.type === 'removed')

                                            let allowed = true;
                                            const aListing = await transFormListingData(change.doc);

                                            // Given the Firestore limitations, the price range filters could not be added to the query.
                                            // The solution is to filter according to the scheme below.
                                            if (priceFrom !== null)
                                                allowed = (aListing.currentPrice >= priceFrom);
                                            if (priceTo !== null)
                                                allowed = allowed && (aListing.currentPrice <= priceTo);
                                            
                                            // To remove from the listings, those that fall outside the price range.
                                            if (allowed) {
                                                if (comparison === 0) // listing exists in theListings array.
                                                    theListings[index2] = aListing; // listing exists in theListings array, update.
                                                else if (comparison < 0) // New listing, before theListings[index2]
                                                        theListings.splice(index2, 0, aListing); // Insert new listing before theListings[index2]
                                                else { // New listing is after theListings[index2]
                                                    // Insert after theListings[index2].
                                                    if (index2 + 1 <= theListings.length - 1)
                                                        theListings.splice(index2 + 1, 0, aListing);
                                                    else
                                                        theListings.push(aListing);
                                                } // else
                                            } // if (allowed)
                                            else if (comparison === 0)
                                                theListings.splice(index2, 1); // Remove if found in theListings. No longer allowed.
                                        } // for (let index1 in changes)

                                        let lastDoc = null;
                                        if (theListings.length > 0) {
                                            lastDoc = theListings[theListings.length - 1];
                                            lastDocRef.current = await getDocumentSnapshot(`/listings/${lastDoc.listingId}`);
                                        } // if (theListings.length > 0) {

                                        setListings(theListings);
                                        setPagination(theListings.length);
                                        updateVar(LISTINGS, theListings);
                                        setListingsLoaded(true);
                                    }, // snapshot=> {
                                    error=> {
                                    }
                                );
    } // async function reCreateQueryListener() {

    async function load() {
        await loadListings();
        await recreateQueryListener();
    } // async function load() {

    async function loadListings() {
        setListingsLoaded(false);
        let theListings = [];
        do {
            let qry;
            if (lastDocRef.current === null)
                qry = await createQuery();
            else
                qry = await createQuery(FetchTypes.START_AFTER_DOC); // await added because createQuery tends to behave asynchronously.
            
            const snapshot = await getDocs(qry); // Execute the query and return the results (document snapshots).

            if (snapshot.docs.length === 0)
                break;
            
            lastDocRef.current = snapshot.docs[snapshot.docs.length - 1];
            
            let priceFrom = null,
                priceTo = null;

            if (varExists(PRICE_FROM))
                priceFrom = getVar(PRICE_FROM);
            if (varExists(PRICE_TO))
                priceTo = getVar(PRICE_TO);

            for (const index in snapshot.docs) {
                const snapshotDoc = snapshot.docs[index];

                if (listings.findIndex(doc=> (doc.listingId === snapshotDoc.id)) >= 0)
                    continue;

                const myListing = await transFormListingData(snapshotDoc);
                let addListing = true;
                
                // Given the Firestore limitations, the price range filters could not be added to the query.
                // The solution is to filter according to the scheme below.
                if (priceFrom !== null)
                    addListing = (myListing.currentPrice >= priceFrom);
                if (priceFrom !== null)
                    addListing = addListing && (myListing.currentPrice <= priceTo);

                if (addListing)
                    theListings.push(myListing);
            } // for (const index in snapshotDocs) {
        } while (theListings.length < numDocsToFetch);

        const updatedListings = listings.concat(theListings);
        updateVar(LISTINGS, updatedListings);
        setListingsLoaded(true);
    } // function loadListings()

    async function transFormListingData(listingSnapshot) {
    /**Add fields such as provinceName, municipalityName, mainPlaceName, subPlaceName, 
     * and currentPrice. Also convert Timestamp dates to Javascript dates. */
        const listing = listingSnapshot.data();
        listing.listingId = listingSnapshot.id;
        
        if (!varExists(PROVINCES))
            addVar(PROVINCES, []);

        if (!varExists(MUNICIPALITIES))
            addVar(MUNICIPALITIES, []);

        if (!varExists(MAIN_PLACES))
            addVar(MAIN_PLACES, []);

        if (!varExists(SUB_PLACES))
            addVar(SUB_PLACES, []);

        let provinces = getVar(PROVINCES),
            municipalities = getVar(MUNICIPALITIES),
            mainPlaces = getVar(MAIN_PLACES),
            subPlaces = getVar(SUB_PLACES);
               
        let province = provinces.find(prov=> {
            return prov.code === listing.address.provincialCode;
        });
        if (province === undefined) {
            province = await getProvince(listing.address.provincialCode);
            provinces.push(province);
        }
        listing.address.provinceName = province.name;

        let municipality = municipalities.find(municipal=> {
            return municipal.provincialCode === listing.address.provincialCode
                    && municipal.code === listing.address.municipalityCode;
        });
        if (municipality === undefined) {
            // Add the municipality to the listing belongs, if it does not exist.
            municipality = await getMunicipality(listing.address.provincialCode, 
                                                    listing.address.municipalityCode);
            municipality = {
                ...municipality,
                provincialCode: listing.address.provincialCode
            };
            municipalities = [...municipalities, municipality];
        }
        listing.address.municipalityName = municipality.name;

        let mainPlace = mainPlaces.find(place=> {
            return place.provincialCode === listing.address.provincialCode
                    && place.municipalityCode === listing.address.municipalityCode
                    && place.code === listing.address.mainPlaceCode;
        });
        if (mainPlace === undefined) {
            mainPlace = await getMainPlace(listing.address.provincialCode, listing.address.municipalityCode, listing.address.mainPlaceCode);
            mainPlace = {
                ...mainPlace,
                provincialCode: listing.address.provincialCode,
                municipalityCode: listing.address.municipalityCode
            };
            mainPlaces = [...mainPlaces, mainPlace];
        } // if (mainPlace === undefined) {
        listing.address.mainPlaceName = mainPlace.name;

        let subPlace = subPlaces.find(place=> {
            return place.provincialCode === listing.address.provincialCode
                    && place.municipalityCode === listing.address.municipalityCode
                    && place.mainPlaceCode === listing.address.mainPlaceCode
                    && place.code === listing.address.subPlaceCode;
        });
        if (subPlace === undefined) {
            subPlace = await getSubPlace(listing.address.provincialCode, listing.address.municipalityCode,
                                            listing.address.mainPlaceCode, listing.address.subPlaceCode);
            subPlace = {
                ...subPlace,
                provincialCode: listing.address.provincialCode,
                municipalityCode: listing.address.municipalityCode,
                mainPlaceCode: listing.address.mainPlaceCode
            };
            subPlaces = [...subPlaces, subPlace];
        } // if (subPlace === undefined) {
        listing.address.subPlaceName = subPlace.name;            
        
        // Convert the Firestore Timestamp dates to Javascript dates.
        listing.dateCreated = listing.dateCreated.toDate();
        if ('offer' in listing.priceInfo)
            listing.priceInfo.offer.expiryDate = listing.priceInfo.offer.expiryDate.toDate();
        
        // Set the current price of the listing.
        listing.currentPrice = listing.priceInfo.regularPrice;
        if ('offer' in listing.priceInfo && listing.priceInfo.offer.expiryDate.getTime() >= Date.now())
            listing.currentPrice = listing.priceInfo.offer.discountedPrice;
        
        updateVar(PROVINCES, provinces);
        updateVar(MUNICIPALITIES, municipalities);
        updateVar(MAIN_PLACES, mainPlaces);
        updateVar(SUB_PLACES, subPlaces);
        return listing;
    } // async function transFormListingData(listing)
    
    async function call() {
        if (!varExists(LISTINGS)) {
            addVar(LISTINGS, []);
            addVar(PAGE_NUM, 1);
            load();
        } // if (!varExists(NUMBER_OF_DOCS))
        else { /* Caters for situations where user returns to this page from search or explore pages.
                  It is required to reload the listings data.
                */
            const prevListings = getVar(LISTINGS);
            const prevLocation = getLocations()[1];

            if (['/search/all', '/search/offers',
                 `/explore/${params.provincialCode}/${params.municipalityCode}/${params.mainPlaceCode}`]
                .includes(prevLocation)) {
                updateVar(LISTINGS, []);
                updateVar(PAGE_NUM, 1);
                load();                    
            }
            else {
                if (prevListings.length === 0) {
                    updateVar(LISTINGS, []);
                    updateVar(PAGE_NUM, 1);
                    load();
                } // if (prevListings.length === 0) {
                else {
                    setListings(prevListings);
                    setPagination(prevListings.length);
                    setPageNum(getVar(PAGE_NUM));
                    let lastDoc = prevListings[prevListings.length - 1];
                    lastDocRef.current = await getDocumentSnapshot(`/listings/${lastDoc.listingId}`);

                    if (lastDocRef.current !== null)
                        recreateQueryListener();
                }
            } // else

        } // else

        if (!varExists(CLICKED_LISTING))
            addVar(CLICKED_LISTING, null);
    } // async function call()

    useEffect(() => {
        if (firstRenderRef.current === true) { // This is to prevent multiple re-renders/re-runs of the effect.
            setListingsLoaded(false);

            if (!varExists(GET_LISTINGS_QUERY_OBJECT)) {
                /** Handle situations in which the user did not start from any of the explore or search pages to get to this page.
                 * In this instance take the user to the appropriate explore page.
                 */
                if (currLocation === '/search/offers/listings') // currLocation - current location (url).
                    navigate('/search/offers');
                else if (currLocation === '/search/all/listings')
                    navigate('/search/all');
                else if (currLocation.startsWith('/explore/'))
                    navigate('/');
            }
            else {
                call();
            }
            setListingsLoaded(true);
        } // if (firstRenderRef.current === true) {
        firstRenderRef.current = false;
        // When the component dismounts, unsubscribe from listening for listing data updates.
        return ()=> {
            if (unsubscribeRef.current !== null)
                unsubscribeRef.current();
        }
    }, []); // useEffect(() => {

    return (
        <div className='w3-container'>            
            {(listingsLoaded === false)?
                <Loader message={'Loading listings. Please wait...'}/>
                :
                <>
                    {(listings.length > 0)?
                        <div>
                            <div style={{overflowX: 'auto'}}>
                                {
                                    listings
                                    .slice((pageNum - 1) * numDocsToFetch, pageNum * numDocsToFetch)
                                    .map(listing=> 
                                        (
                                            <NavLink onClick={e=> goToListing(listing)} key={listing.listingId}>
                                                <div className="w3-card-4 w3-margin-right w3-margin-top w3-margin-bottom"
                                                    style={{marginLeft: '1.25px', width: '250px', height: 'fit-content', display: 'inline-block', verticalAlign: 'top'}}>
                                                    <div className='w3-container w3-center'>
                                                        <h4>
                                                            {
                                                                toZarCurrencyFormat(listing.currentPrice)
                                                                + (listing.transactionType === 'Rent'? ' / month': '')
                                                            }
                                                        </h4>
                                                        <img src={listing.images[0].url} alt="main image" style={{width: '100%', height: '100%', objectFit: 'contain'}}/>
                                                    </div>

                                                    <div className="w3-container w3-center w3-padding-small">
                                                        <div className='w3-margin-right  side-by-side'><FaBed/> {listing.numBedrooms}</div>
                                                        <div className='w3-margin-right side-by-side'><FaBath/> {listing.numBathrooms}</div>
                                                        <div className='w3-margin-right side-by-side'><FaRulerCombined/> {listing.totalFloorArea}m<sup>2</sup></div>
                                                        {('erfSize' in listing) &&
                                                            <div className='w3-margin-right side-by-side'><FaLandmark/> {listing.erfSize}m<sup>2</sup></div>
                                                        }
                                                        <div className='w3-margin-right side-by-side'><FaCar/> {listing.parkingCapacity}</div>
                                                        {('garageCapacity' in listing) &&
                                                            <div className='w3-margin-right side-by-side'><GiHomeGarage/> {listing.garageCapacity}</div>
                                                        }
                                                    </div>
                            
                                                    <div className="w3-container w3-center w3-padding-small">
                                                        {`${listing.propertyType} for ${listing.transactionType}`}<br/>
                                                        {listing.address.subPlaceName},<br/>
                                                        {listing.address.mainPlaceName},<br/>
                                                        {listing.address.municipalityName},<br/>
                                                        {listing.address.provinceName}<br/>           
                                                    </div>
                                                </div>                                    
                                            </NavLink>
                                        )
                                    )
                                }
                            </div>

                            {numPages > 1 &&
                                <div className="w3-bar w3-margin w3-centered">
                                    {
                                        generateSeqArray(numPages).map(anInteger=>
                                            (
                                                <NavLink className="w3-btn w3-round w3-margin-small" key={anInteger} style={(pageNum === anInteger)?
                                                         selectedItemStyle : w3ThemeD5} onClick={e=> (pageNum !== anInteger && setPageNum(anInteger))}>
                                                    {anInteger}
                                                </NavLink>
                                            )
                                        )
                                    }
                                </div>
                            }
                            
                            {(pageNum === numPages) &&
                                <p>
                                    <NavLink className="w3-btn w3-round w3-theme-d5" onClick={e=> load()}>Load more...</NavLink>
                                </p>
                            }
                        </div>
                        :
                        <p>
                            No listings ...
                        </p>
                    }
                    {currLocation !== '/my-profile/listings' &&
                        <p>
                            <NavLink className="w3-btn w3-round w3-theme-d5"  to={backTo.link}>{backTo.text}</NavLink>
                        </p>
                    }
                </>
            }             
        </div>
    );
}

export default memo(Listings);
