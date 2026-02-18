/**
 * File: '../src/components/Listings.js'
 * Purpose: Display thumbnails of listings.
 * 
 * Start Date   End Date    Dev  Version  Description
 * 2024/01/27               ITA  1.00     Genesis.
 * 2024/01/28               ITA  1.01     Tweak the useEffect to render the listings consistently. Add pagination.
 * 2024/07/01               ITA  1.02     QueryTypes object renamed to FetchTypes. Its properties also renamed.
 *                                        Check previous url locations as to whether data must be reloaded when this page loads.
 *                                        In the Firestore listener (onSnapshot), make use of the binarySearchObj function to help
 *                                        add new listings at the right position on the listings array.
 *                                        Remove the use of function getSortedObject. It is not necessary.
 * 2024/07/14               ITA  1.03     Maximum number of documents fetched from Firestore settable in the environment variables. Default: 10.
 * 2024/08/07               ITA  1.04     Determine correctly when to re-load listings when the user is exploring listings.
 * 2024/08/08               ITA  1.05     Fix: Places (provinces, municipalities, etc.) shared vars Context state to be checked and added on first render of the component.
 *                                        This guarantees availability for any subsequent use.
 * 2024/08/14               ITA  1.06     Fix: Code must separately (apart from listings shared var) check if the page number shared var exists before it is added.
 * 2024/09/18               ITA  1.07     Import context directly. Variaable names moved to the VarNames object.
 *                                        Current User state mmoved to Global State.
 *                                        Query names to replace use of paths (url) to specify which listings query to fetch.
 *                                        Link instead of NavLink suffices for non-menu-item links.
 * 2026/01/10  2026/01/11   ITA  1.08     Database listening functionality removed. No longer desired.
 *                                        Improved data loading functionality such that the 'loader' actually runs while the listings are being fetched, instead of the page displaying 'No listings'.
 *                                        getListingsByPlacesQueryObject() now allows price range queries.
 * 2026/02/17  2026/02/17   ITA  1.09     While more listings were fetched, the loader took the place of the currently displayed listings. Now the loader, displays at the bottom of the current listings while waiting for fetched listings.
 * 
 */
import { useState, useRef, useEffect, memo } from 'react';
import { VarNames,
         getListingsByUserIdQueryObject, getListingsByPlacesQueryObject,
         FetchTypes, getDocumentSnapshot, transformListingData, 
         QueryNames,
         getAllListingsQueryObject} from '../utilityFunctions/firestoreComms';
import { getDocs } from 'firebase/firestore';
import { toZarCurrencyFormat } from 'some-common-functions-js';
import { useSharedVarsContext } from '../hooks/SharedVarsProvider';
import { FaBed, FaBath, FaRulerCombined, FaCar, FaLandmark } from "react-icons/fa";
import { GiHomeGarage } from "react-icons/gi";
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Loader from './Loader';
import { useGlobalStateContext } from '../hooks/GlobalStateProvider.js';
import { w3ThemeD5, selectedItemStyle } from './moreStyles.js';

function Listings() {
    const { getVar, addVar, updateVar, varExists} = useSharedVarsContext();
    const { getSlice } = useGlobalStateContext();
    const [currentUser] = useState(getSlice('authCurrentUser'));
    const [listings, setListings] = useState([]);
    const [listingsLoaded, setListingsLoaded] = useState(false);
    const [moreListingsLoaded, setMoreListingsLoaded] = useState(true);
    const firstRenderRef = useRef(true);
    const lastDocRef = useRef(null); /**The last fetched document from Firestore.*/
    const navigate = useNavigate();
    const location = useLocation();
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
                const transactionType = transactionTypes[0];
                const priceFrom = getVar(VarNames.PRICE_FROM);
                const priceTo = getVar(VarNames.PRICE_TO);
                const propertyTypes = getVar(VarNames.PROPERTY_TYPES);
                const numberOfBedrooms = getVar(VarNames.NUMBER_OF_BEDROOMS);
                const offersOnly = getVar(VarNames.OFFERS_ONLY);

                const places = (()=> {
                    if (mainPlaces.length > 0)
                        return mainPlaces;
                    if (municipalities.length > 0)
                        return municipalities;
                    if (provinces.length > 0)
                        return provinces;
                    return [];
                })();
                let params = {
                    places, transactionType, priceFrom, priceTo, propertyTypes, numberOfBedrooms,
                    numDocs: numDocsToFetch, snapshotDoc: lastDocRef.current,
                    offersOnly, fetchType
                };
                qry = getListingsByPlacesQueryObject(params);
            } // if (varExists(VarNames.MAIN_PLACES))
        }
        else if (queryName === QueryNames.ALL_LISTINGS) {
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

    async function loadListings() {
        if (listings.length === 0)
            setListingsLoaded(false);
        else
            setMoreListingsLoaded(false);

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

            const provinces = [...getVar(VarNames.PROVINCES)];
            const municipalities = [...getVar(VarNames.MUNICIPALITIES)];
            const mainPlaces = [...getVar(VarNames.MAIN_PLACES)];
            const subPlaces = [...getVar(VarNames.SUB_PLACES)];

            for (const index in snapshot.docs) {
                const snapshotDoc = snapshot.docs[index];

                // Avoid duplication...
                if (existingListings.some(doc=> (doc.listingId === snapshotDoc.id)))
                    continue;
                
                const myListing = await transformListingData(provinces, municipalities,
                                                             mainPlaces, subPlaces, snapshotDoc);
                theListings.push(myListing);
            } // for (const index in snapshotDocs) {
        } while (theListings.length < numDocsToFetch);

        const updatedListings = existingListings.concat(theListings);
        if (!varExists(VarNames.LISTINGS))
            addVar(VarNames.LISTINGS, updatedListings);
        else
            updateVar(VarNames.LISTINGS, updatedListings);

        setListings([...updatedListings]);
        setListingsLoaded(true);
        setMoreListingsLoaded(true);
        setPagination(updatedListings.length);
    } // function loadListings()

    /**Perform tasks such as loading shared context, retrieving listings and setting pagination */
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
            addVar(VarNames.LISTINGS, []);
            await loadListings();
        } // if (!varExists(VarNames.PROVINCES))
        else {
            const prevListings = getVar(VarNames.LISTINGS);

            if (prevListings.length === 0) {
                await loadListings();
            } // if (prevListings.length === 0) {
            else {
                setListings(prevListings);
                setPagination(prevListings.length);
                setPageNum(getVar(VarNames.PAGE_NUM));
                let lastDoc = prevListings[prevListings.length - 1];
                /* The last document that was fetched will be used to as the reference point from which to start,
                   whenever there is a call to fetch more listings.
                */
                lastDocRef.current = await getDocumentSnapshot(`/listings/${lastDoc.listingId}`);
            } // else
        } // else

        if (!varExists(VarNames.CLICKED_LISTING))
            addVar(VarNames.CLICKED_LISTING, null);
    } // async function call()

    useEffect(() => {
        (async () => {
            if (firstRenderRef.current === true) { // This is to prevent multiple re-renders/re-runs of the effect.
                setListingsLoaded(false);
                await call();
                setListingsLoaded(true);
            } // if (firstRenderRef.current === true) {
            firstRenderRef.current = false;
        })();
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
                                                <Link className="w3-btn w3-round" key={anInteger}
                                                        style={{margin: '3px', ...((pageNum === anInteger)? selectedItemStyle : w3ThemeD5)}}
                                                        onClick={e=> (pageNum !== anInteger && setPageNum(anInteger))}>
                                                    {anInteger}
                                                </Link>
                                            )
                                        )
                                    }
                                </div>
                            }
                            
                            {(pageNum === numPages) &&
                                <>
                                {(moreListingsLoaded === false)?
                                    <Loader message={'Loading listings. Please wait...'}/>
                                    :
                                    <p>
                                        <Link className="w3-btn w3-round w3-theme-d5" onClick={async e=> await loadListings()}>Load more...</Link>
                                    </p>
                                }
                                </>
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
