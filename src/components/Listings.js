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
 * 2024/08/07   ITA  1.04     Determine correctly when to re-load listings when the user is exploring listings.
 * 2024/08/08   ITA  1.05     Fix: Places (provinces, municipalities, etc.) shared vars Context state to be checked and added on first render of the component.
 *                            This guarantees availability for any subsequent use.
 * 2024/08/14  ITA   1.06     Fix: Code must separately (apart from listings shared var) check if the page number shared var exists before it is added.
 * 2024/09/18  ITA   1.07     Import context directly. Variaable names moved to the VarNames object.
 *                            Current User state mmoved to Global State.
 *                            Query names to replace use of paths (url) to specify which listings query to fetch.
 *                            Link instead of NavLink suffices for non-menu-item links.
 */
import { useState, useRef, useEffect, memo } from 'react';
import { VarNames,
         getListingsByUserIdQueryObject, getListingsByPlacesQueryObject,
         FetchTypes, getDocumentSnapshot, transformListingData, 
         QueryNames,
         getAllListingsQueryObject} from '../utilityFunctions/firestoreComms';
import { onSnapshot, getDocs } from 'firebase/firestore';
import { toZarCurrencyFormat, binarySearchObj, objCompare } from '../utilityFunctions/commonFunctions';
import { useSharedVarsContext } from '../hooks/SharedVarsProvider';
import { FaBed, FaBath, FaRulerCombined, FaCar, FaLandmark } from "react-icons/fa";
import { GiHomeGarage } from "react-icons/gi";
import { Link, useNavigate, useLocation, useParams } from 'react-router-dom';
import Loader from './Loader';
import { useGlobalStateContext } from '../hooks/GlobalStateProvider.js';
import { w3ThemeD5, selectedItemStyle } from './moreStyles.js';

function Listings() {
    const { getVar, addVar, updateVar, varExists} = useSharedVarsContext();
    const { getSlice } = useGlobalStateContext();
    const [currentUser] = useState(getSlice('authCurrentUser'));
    const [listings, setListings] = useState([]);
    const [listingsLoaded, setListingsLoaded] = useState(false);
    const firstRenderRef = useRef(true);
    
    const lastDocRef = useRef(null); /**The last fetched document from Firestore.*/
    const unsubscribeRef = useRef(null);  /**Will store an object to listen to Firestore fetched documents and update should there
                                             be changes to those documents in Firestore.*/
    const navigate = useNavigate();
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
        if  (currLocation === '/')
            return ['listingId asc'];  // Fetched listings expected to be sorted by listingId.
        else if (currLocation === '/my-profile/listings')
            return ['dateCreated desc', 'listingId desc']; // Fetched listings expected to be sorted by dateCreated, then listingId.
        else
            return [];
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

        updateVar(VarNames.CLICKED_LISTING, listing);
        updateVar(VarNames.PAGE_NUM, pageNum);
        const path = `${currLocation}/${listing.listingId}`.replace('//', '/');
        navigate(path);
    } // function goToListing(listing) {

    async function createQuery(fetchType = null) {
        let qry = null;
        const queryName = getVar(VarNames.QUERY_NAME);

        if (queryName === QueryNames.MY_LISTINGS) {
            if (fetchType === FetchTypes.START_AFTER_DOC)
                qry = getListingsByUserIdQueryObject(currentUser.uid, numDocsToFetch,
                                                     lastDocRef.current, fetchType);
            else if (fetchType === FetchTypes.END_AT_DOC)
                qry = getListingsByUserIdQueryObject(currentUser.uid, null, lastDocRef.current, fetchType);
            else
                qry = getListingsByUserIdQueryObject(currentUser.uid, numDocsToFetch);
        }
        else if (queryName === QueryNames.FILTERED_LISTINGS) {
            if (varExists(VarNames.PROVINCES)) {
                const municipalities = getVar(VarNames.MUNICIPALITIES);
                const mainPlaces = getVar(VarNames.MAIN_PLACES);
                let provinces = getVar(VarNames.PROVINCES);
                provinces = provinces.map(province=> (province.code));
                const transactionTypes = getVar(VarNames.TRANSACTION_TYPES);
                const propertyTypes = getVar(VarNames.PROPERTY_TYPES);
                const numberOfBedrooms = getVar(VarNames.NUMBER_OF_BEDROOMS);
                const offersOnly = getVar(VarNames.OFFERS_ONLY);

                if (offersOnly) {
                    if (fetchType === FetchTypes.START_AFTER_DOC) { // Create a query for fetching data.
                        if (mainPlaces.length > 0)
                            qry = getListingsByPlacesQueryObject(mainPlaces, transactionTypes, 
                                                                propertyTypes, numberOfBedrooms,
                                                                true, numDocsToFetch, lastDocRef.current, fetchType);
                        else if (municipalities.length > 0)
                            qry = getListingsByPlacesQueryObject(municipalities, transactionTypes, 
                                                                propertyTypes, numberOfBedrooms,
                                                                true, numDocsToFetch, lastDocRef.current, fetchType);
                        else if (provinces.length > 0)
                            qry = getListingsByPlacesQueryObject(provinces, transactionTypes, 
                                                                propertyTypes, numberOfBedrooms,
                                                                true, numDocsToFetch, lastDocRef.current, fetchType);
                    }
                    else if (fetchType === FetchTypes.END_AT_DOC) {   // Create a query for listening.                   
                        if (mainPlaces.length > 0)
                            qry = getListingsByPlacesQueryObject(mainPlaces, transactionTypes, 
                                                                propertyTypes, numberOfBedrooms,
                                                                true, null, lastDocRef.current, fetchType);
                        else if (municipalities.length > 0)
                            qry = getListingsByPlacesQueryObject(municipalities, transactionTypes, 
                                                                propertyTypes, numberOfBedrooms,
                                                                true, null, lastDocRef.current, fetchType);
                        else if (provinces.length > 0)
                            qry = getListingsByPlacesQueryObject(provinces, transactionTypes, 
                                                                propertyTypes, numberOfBedrooms,
                                                                true, null, lastDocRef.current, fetchType);
                    }
                    else  {
                        if (mainPlaces.length > 0)
                            qry = getListingsByPlacesQueryObject(mainPlaces, transactionTypes, 
                                                                propertyTypes, numberOfBedrooms,
                                                                true, numDocsToFetch);
                        else if (municipalities.length > 0)
                            qry = getListingsByPlacesQueryObject(municipalities, transactionTypes, 
                                                                propertyTypes, numberOfBedrooms,
                                                                true, numDocsToFetch);
                        else if (provinces.length > 0)
                            qry = getListingsByPlacesQueryObject(provinces, transactionTypes, 
                                                                propertyTypes, numberOfBedrooms,
                                                                true, numDocsToFetch);
                    }
                } // if (offersOnly)
                else {
                    if (fetchType === FetchTypes.START_AFTER_DOC) {
                        if (mainPlaces.length > 0)
                            qry = getListingsByPlacesQueryObject(mainPlaces, transactionTypes, 
                                                                propertyTypes, numberOfBedrooms,
                                                                false, numDocsToFetch, lastDocRef.current, fetchType);
                        else if (municipalities.length > 0)
                            qry = getListingsByPlacesQueryObject(municipalities, transactionTypes, 
                                                                propertyTypes, numberOfBedrooms,
                                                                false, numDocsToFetch, lastDocRef.current, fetchType);
                        else if (provinces.length > 0)
                            qry = getListingsByPlacesQueryObject(provinces, transactionTypes, 
                                                                propertyTypes, numberOfBedrooms,
                                                                false, numDocsToFetch, lastDocRef.current, fetchType);
                    }
                    else if (fetchType === FetchTypes.END_AT_DOC) {
                        if (mainPlaces.length > 0)
                            qry = getListingsByPlacesQueryObject(mainPlaces, transactionTypes, 
                                                                propertyTypes, numberOfBedrooms,
                                                                false, null, lastDocRef.current, fetchType);
                        else if (municipalities.length > 0)
                            qry = getListingsByPlacesQueryObject(municipalities, transactionTypes, 
                                                                propertyTypes, numberOfBedrooms,
                                                                false, null, lastDocRef.current, fetchType);
                        else if (provinces.length > 0)
                            qry = getListingsByPlacesQueryObject(provinces, transactionTypes, 
                                                                propertyTypes, numberOfBedrooms,
                                                                false, null, lastDocRef.current, fetchType);
                    }
                    else { // fetchType === null
                        if (mainPlaces.length > 0)
                            qry = getListingsByPlacesQueryObject(mainPlaces, transactionTypes, 
                                                                propertyTypes, numberOfBedrooms,
                                                                false, numDocsToFetch);
                        else if (municipalities.length > 0)
                            qry = getListingsByPlacesQueryObject(municipalities, transactionTypes, 
                                                                propertyTypes, numberOfBedrooms,
                                                                false, numDocsToFetch);
                        else if (provinces.length)
                            qry = getListingsByPlacesQueryObject(provinces, transactionTypes, 
                                                                propertyTypes, numberOfBedrooms,
                                                                false, numDocsToFetch);
                    }
                } // else

            } // if (varExists(VarNames.MAIN_PLACES))
        }
        else if (queryName === QueryNames.ALL_LISTINGS) {
            console.log({queryName, fetchType});
            if (fetchType === FetchTypes.START_AFTER_DOC) {
                qry = getAllListingsQueryObject(numDocsToFetch, lastDocRef.current, fetchType);
            }
            else if (fetchType === FetchTypes.END_AT_DOC) {                   
                qry = getAllListingsQueryObject(null, lastDocRef.current, fetchType);
            }
            else { // fetchType === null
                qry = getAllListingsQueryObject(numDocsToFetch);
            } // else
        } // else if (queryName === QueryNames.ALL_LISTINGS)
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
        if (!qry) // null
            return;
            
        unsubscribeRef.current = onSnapshot(
                                    qry, 
                                    async snapshot=> {
                                        setListingsLoaded(false);
                                        let theListings = [...getVar(VarNames.LISTINGS)];
                                        let priceFrom = null,
                                            priceTo = null;
                                        let offersOnly = false;
                                        
                                        const queryName = getVar(VarNames.QUERY_NAME);

                                        // No listings to be filtered according to price range or offers if all listings or all user's are sought.
                                        // Listings to be filtered according to price range or offers if the user used a search filter (SearchListings component).
                                        if (!([QueryNames.ALL_LISTINGS, QueryNames.MY_LISTINGS].includes(queryName))) {
                                            if (varExists(VarNames.PRICE_FROM))
                                                priceFrom = getVar(VarNames.PRICE_FROM);
                                            if (varExists(VarNames.PRICE_TO))
                                                priceTo = getVar(VarNames.PRICE_TO);
                                            if (varExists(VarNames.OFFERS_ONLY))
                                                offersOnly = getVar(VarNames.OFFERS_ONLY);
                                        } // if (!([QueryNames.ALL_LISTINGS, QueryNames.MY_LISTINGS].includes(queryName))) {

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

                                            const provinces = [...getVar(VarNames.PROVINCES)];
                                            const municipalities = [...getVar(VarNames.MUNICIPALITIES)];
                                            const mainPlaces = [...getVar(VarNames.MAIN_PLACES)];
                                            const subPlaces = [...getVar(VarNames.SUB_PLACES)];
                                            const aListing = await transformListingData(provinces, municipalities, 
                                                                                        mainPlaces, subPlaces, change.doc);
                                            let allowed = true;
                                            // Given the Firestore limitations, the price range filters could not be added to the query.
                                            // The solution is to filter according to the scheme below.
                                            if (priceFrom)
                                                allowed = (aListing.currentPrice >= priceFrom);
                                            if (priceTo)
                                                allowed = allowed && (aListing.currentPrice <= priceTo);
                                            if (allowed && offersOnly)
                                                allowed = (aListing.priceInfo.offer.expiryDate >= new Date());
                                            
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

                                        setPagination(theListings.length);
                                        updateVar(VarNames.LISTINGS, theListings);
                                        setListings([...theListings]);                                        
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
        const existingListings = varExists(VarNames.LISTINGS)? [...getVar(VarNames.LISTINGS)] : [];
        const queryName = getVar(VarNames.QUERY_NAME);
        do {
            let qry;
            if (lastDocRef.current === null)
                qry = await createQuery();
            else
                qry = await createQuery(FetchTypes.START_AFTER_DOC); // await added because createQuery tends to behave asynchronously.
            if (!qry)
                return;

            const snapshot = await getDocs(qry); // Execute the query and return the results (document snapshots).
            if (snapshot.docs.length === 0)
                break;

            lastDocRef.current = snapshot.docs[snapshot.docs.length - 1];
            let priceFrom = null,
                priceTo = null;            
            let offersOnly = false;
            
            // No listings to be filtered according to price range or offers if all listings or all user's are sought.
            // Listings to be filtered according to price range or offers if the user used a search filter (SearchListings component).
            if (!([QueryNames.ALL_LISTINGS, QueryNames.MY_LISTINGS].includes(queryName))) {
                // Price criteria excluded when searching for all listings or the listings of a single user.
                if (varExists(VarNames.PRICE_FROM))
                    priceFrom = getVar(VarNames.PRICE_FROM);
                if (varExists(VarNames.PRICE_TO))
                    priceTo = getVar(VarNames.PRICE_TO);
                if (varExists(VarNames.OFFERS_ONLY))
                    offersOnly = getVar(VarNames.OFFERS_ONLY);
            } // if (!([QueryNames.ALL_LISTINGS, QueryNames.MY_LISTINGS].includes(queryName))) {

            const provinces = [...getVar(VarNames.PROVINCES)];
            const municipalities = [...getVar(VarNames.MUNICIPALITIES)];
            const mainPlaces = [...getVar(VarNames.MAIN_PLACES)];
            const subPlaces = [...getVar(VarNames.SUB_PLACES)];

            for (const index in snapshot.docs) {
                const snapshotDoc = snapshot.docs[index];

                // Avoid duplication...
                if (existingListings.findIndex(doc=> (doc.listingId === snapshotDoc.id)) >= 0)
                    continue;
                
                const myListing = await transformListingData(provinces, municipalities,
                                                             mainPlaces, subPlaces, snapshotDoc);
                let addListing = true;

                /* Given the Firestore limitations, the price range filters could not be added to the query.
                   This would have required a huge index, more than one of them for the different range of search criteria.
                   This a challenge with filters/clauses involving inequality >=, > and <= and < comparisons.
                   The solution is to apply price filter within code, as below... */
                if (priceFrom)
                    addListing = (myListing.currentPrice >= priceFrom);
                if (priceFrom)
                    addListing = addListing && (myListing.currentPrice <= priceTo);

                // Similar to reasons given on the previous comment. We will apply offer filter within code.
                if (addListing && offersOnly)
                    addListing = (myListing.priceInfo.offer.expiryDate >= new Date());

                if (addListing) {
                    theListings.push(myListing);
                }
            } // for (const index in snapshotDocs) {
        } while (theListings.length < numDocsToFetch);

        const updatedListings = existingListings.concat(theListings);
        if (!varExists(VarNames.LISTINGS))
            addVar(VarNames.LISTINGS, updatedListings);
        else
            updateVar(VarNames.LISTINGS, updatedListings);

        console.log({existingListings, theListings});
        setListings([...updatedListings]);
        setListingsLoaded(true);
    } // function loadListings()
 
    


















































































































































































































































































































































































    



















    



















    



















    



















    



















    



















    



















    



















    



















    



















    



















    




















    async function call() {
        if (!varExists(VarNames.PROVINCES))
            addVar(VarNames.PROVINCES, []);
        if (!varExists(VarNames.MUNICIPALITIES))
            addVar(VarNames.MUNICIPALITIES, []);
        if (!varExists(VarNames.MAIN_PLACES))
            addVar(VarNames.MAIN_PLACES, []);
        if (!varExists(VarNames.SUB_PLACES))
            addVar(VarNames.SUB_PLACES, []);
        if (!varExists(VarNames.TRANSACTION_TYPES))
            addVar(VarNames.TRANSACTION_TYPES, []);
        if (!varExists(VarNames.PROPERTY_TYPES))
            addVar(VarNames.PROPERTY_TYPES, []);
        if (!varExists(VarNames.NUMBER_OF_BEDROOMS))
            addVar(VarNames.NUMBER_OF_BEDROOMS, []);
        if (!varExists(VarNames.OFFERS_ONLY))
            addVar(VarNames.OFFERS_ONLY, false);
        if (!varExists(VarNames.PAGE_NUM))
            addVar(VarNames.PAGE_NUM, 1);
        if (!varExists(VarNames.LISTINGS)) {
            console.log('addVar(VarNames.LISTINGS, []);');
            addVar(VarNames.LISTINGS, []);
            load();
        } // if (!varExists(VarNames.PROVINCES))
        else {
            const prevListings = getVar(VarNames.LISTINGS);

            if (prevListings.length === 0) {
                load();
            } // if (prevListings.length === 0) {
            else {
                setListings(prevListings);
                setPagination(prevListings.length);
                setPageNum(getVar(VarNames.PAGE_NUM));
                let lastDoc = prevListings[prevListings.length - 1];
                lastDocRef.current = await getDocumentSnapshot(`/listings/${lastDoc.listingId}`);

                if (lastDocRef.current !== null)
                    recreateQueryListener();
            } // else

        } // else

        if (!varExists(VarNames.CLICKED_LISTING))
            addVar(VarNames.CLICKED_LISTING, null);
    } // async function call()

    useEffect(() => {
        if (firstRenderRef.current === true) { // This is to prevent multiple re-renders/re-runs of the effect.
            setListingsLoaded(false);
            call();
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
                                            <Link onClick={e=> goToListing(listing)} key={listing.listingId}>
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
                                            </Link>
                                        )
                                    )
                                }
                            </div>

                            {numPages > 1 &&
                                <div className="w3-bar w3-margin w3-centered">
                                    {
                                        generateSeqArray(numPages).map(anInteger=>
                                            (
                                                <Link className="w3-btn w3-round w3-margin-small" key={anInteger} style={(pageNum === anInteger)?
                                                         selectedItemStyle : w3ThemeD5} onClick={e=> (pageNum !== anInteger && setPageNum(anInteger))}>
                                                    {anInteger}
                                                </Link>
                                            )
                                        )
                                    }
                                </div>
                            }
                            
                            {(pageNum === numPages) &&
                                <p>
                                    <Link className="w3-btn w3-round w3-theme-d5" onClick={e=> load()}>Load more...</Link>
                                </p>
                            }
                        </div>
                        :
                        <p>
                            No listings ...
                        </p>
                    }
                </>
            }             
        </div>
    );
}

export default memo(Listings);
