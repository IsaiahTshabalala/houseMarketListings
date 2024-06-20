/**
 * File: '../src/components/Listings.js'
 * Purpose: Display thumbnails of listings.
 * 
 * Date         Dev  Version  Description
 * 2024/01/27   ITA  1.00     Genesis.
 * 2024/01/28   ITA  1.01     Tweak the useEffect to render the listings consistently. Add pagination.
 */
import { useState, useRef, useEffect, useContext, useMemo, memo } from 'react';
import { CLICKED_LISTING, GET_LISTINGS_QUERY_OBJECT, PROVINCES, MUNICIPALITIES,
         MAIN_PLACES, SUB_PLACES, TRANSACTION_TYPES, PROPERTY_TYPES,
         NUMBER_OF_BEDROOMS, PRICE_FROM, PRICE_TO,
         getProvince, getMunicipality, getMainPlace, getSubPlace,
         LISTINGS, QueryTypes, LAST_DOC, NUMBER_OF_DOCS,
         QUERY_TIME} from '../utilityFunctions/firestoreComms';
import { onSnapshot, getDocs } from 'firebase/firestore';
import { toZarCurrencyFormat, getSortedObject } from '../utilityFunctions/commonFunctions';
import { sharedVarsContext } from '../hooks/SharedVarsProvider';
import { FaBed, FaBath, FaRulerCombined, FaCar, FaLandmark } from "react-icons/fa";
import { GiHomeGarage } from "react-icons/gi";
import { NavLink, useNavigate, useLocation, useParams } from 'react-router-dom';
import Loader from './Loader';
import { userContext } from '../hooks/UserProvider';
import { w3ThemeD5, selectedItemStyle } from './moreStyles.js';

function Listings() {
    const { getVar, addVar, updateVar, varExists} = useContext(sharedVarsContext);
    const { currentUser } = useContext(userContext);
    const [listings, setListings] = useState([]);
    const [listingsLoaded, setListingsLoaded] = useState(true);
    const firstRenderRef = useRef(true);
    
    const lastDocRef = useRef(null); /**The last fetched document from Firestore. The position after which to Fetch next batch of data.*/
    const unsubscribeRef = useRef(null);  /**Will store an object to listen to Firestore fetched documents and update should there
                                             be changes to those documents in Firestore.*/
    const numDocsToListenToRef = useRef(0);
    const navigate = useNavigate();
    const location = useLocation();
    const params = useParams();
    const numDocsToFetch = 3;
    const queryTimeRef = useRef(0);
    const [numPages, setNumPages] = useState(1);
    const [pageNum, setPageNum] = useState(1);

    const backTo = useMemo(()=> {        
        let returnTo = {
            link: '#',
            text: ''
        };

        if  (location.pathname === '/search/listings') {
            returnTo = {
                link: '/search',
                text: 'Back to Search All Listings'
            };
        }
        else if (location.pathname === '/search/offers/listings') {
            returnTo = {
                link: '/search/offers',
                text: 'Back to Search for Offers'
            };
        }
        else if (location.pathname ===`/explore/${params.provincialCode}/${params.municipalityCode}/${params.mainPlaceCode}`) {
            returnTo = {
                link: `/explore/${params.provincialCode}`,
                text: 'Back to Explore Listings'
            };
        }
        return returnTo;
    }, []);

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

        let path = location.pathname;
        navigate(`${path}/${listing.docId}`);
    } // function goToListing(listing) {

    async function createQuery(queryType) {
        let qry = null;
        const functionGetQueryObject = getVar(GET_LISTINGS_QUERY_OBJECT);
        if (location.pathname === `/my-profile/listings`) {
            if (queryType === QueryTypes.START_AFTER_LAST_DOC)
                qry = functionGetQueryObject(currentUser.authCurrentUser.uid, numDocsToFetch, lastDocRef.current);
            else if (queryType === QueryTypes.START_FROM_BEGINNING)
                qry = functionGetQueryObject(currentUser.authCurrentUser.uid, numDocsToListenToRef.current);
        }
        else if (['/search/listings', '/search/offers/listings'].includes(location.pathname)) {
            /**Shared vars must have been provided via the SearchListings component. */
            if (varExists(MAIN_PLACES)) {
                const mainPlaces = getVar(MAIN_PLACES);
                const transactionTypes = getVar(TRANSACTION_TYPES);
                const propertyTypes = getVar(PROPERTY_TYPES);
                const numberOfBedrooms = getVar(NUMBER_OF_BEDROOMS);

                if (location.pathname === '/search/offers/listings') {
                    if (queryType === QueryTypes.START_AFTER_LAST_DOC) // Create a query for fetching data.
                        qry = functionGetQueryObject(mainPlaces, transactionTypes, 
                                                     propertyTypes, numberOfBedrooms,
                                                     true, numDocsToFetch, lastDocRef.current);
                    else if (queryType === QueryTypes.START_FROM_BEGINNING) // Create a query for listening.                   
                        qry = functionGetQueryObject(mainPlaces, transactionTypes, 
                                                     propertyTypes, numberOfBedrooms,
                                                     true, numDocsToListenToRef.current);
                } // if (location.pathname === '/listings/offers')
                else {
                    if (queryType === QueryTypes.START_AFTER_LAST_DOC)
                        qry = functionGetQueryObject(mainPlaces, transactionTypes, 
                                                     propertyTypes, numberOfBedrooms,
                                                     false, numDocsToFetch, lastDocRef.current);
                    else if (queryType === QueryTypes.START_FROM_BEGINNING)
                        qry = functionGetQueryObject(mainPlaces, transactionTypes, 
                                                     propertyTypes, numberOfBedrooms,
                                                    false, numDocsToListenToRef.current);                  
                } // else

            } // if (varExists(MAIN_PLACES))
        } // else if (['/listings', '/listings/offers'].includes(location.pathname)) {
        else if (location.pathname.startsWith('/explore/')) {
            const provincialCode = params.provincialCode;
            const municipalityCode = params.municipalityCode;
            const mainPlaceCode = params.mainPlaceCode;

            if (provincialCode !== undefined && municipalityCode !== undefined && mainPlaceCode !== undefined) {
                if (queryType === QueryTypes.START_AFTER_LAST_DOC)
                    qry = functionGetQueryObject(provincialCode, municipalityCode, 
                                                    mainPlaceCode, numDocsToFetch,
                                                    lastDocRef.current);
                else if (queryType === QueryTypes.START_FROM_BEGINNING)
                    qry = functionGetQueryObject(provincialCode, municipalityCode, 
                                                    mainPlaceCode, numDocsToListenToRef.current);
            } // if (provincialCode !== undefined && municipalityCode !== undefined && mainPlaceCode !== undefined ...
        }
        return qry;
    } // async function createQuery() {

    async function recreateQueryListener() {
        // Create a listener to listen for listing updates in Firestore.
        // First unsubscribe to the current listener if it exists.
        if (unsubscribeRef.current !== null)
            unsubscribeRef.current();

        if (numDocsToListenToRef.current <= 0) // No listings so far. Nothing to listen to.
            return;
        
        const qry = await createQuery(QueryTypes.START_FROM_BEGINNING);
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
                                        for (let idx in changes) {
                                            const change = changes[idx];
                                            let index = theListings.findIndex(doc=> {
                                                return doc.docId === change.doc.id;
                                            });
                                            let allowed = true;
                                            
                                            if (change.type === 'removed') {
                                                if (index >= 0)
                                                    theListings.splice(index, 1);
                                                continue;
                                            } // if (change.type === 'removed')

                                            const aListing = await transFormListingData(change.doc);

                                            // Given the Firestore limitations, the price range filters could not be added to the query.
                                            // The solution is to filter according to the scheme below.
                                            if (priceFrom !== null)
                                                allowed = (aListing.currentPrice >= priceFrom);
                                            if (priceTo !== null)
                                                allowed = allowed && (aListing.currentPrice <= priceTo);

                                            switch (change.type) {
                                                case 'added': case 'modified':
                                                    // To remove from the listings, those that fall outside the price range.
                                                    if (allowed) {
                                                        if (index >= 0)
                                                            theListings[index] = aListing;
                                                        else if (location.pathname === '/my-profile/listings')
                                                            theListings = [aListing, ...theListings];
                                                        else
                                                            theListings = [...theListings, aListing];
                                                    } // if (allowed)
                                                    else if (index >= 0)
                                                        theListings.splice(index, 1);
                                                    break;
                                                default:
                                                    break;
                                            } // switch(change.type)
                                        } // for (let idx in changes)

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
            const qry = await createQuery(QueryTypes.START_AFTER_LAST_DOC); // await added because createQuery tends to behave asynchronously.
            const snapshot = await getDocs(qry); // Execute the query and return the results (document snapshots).

            if (snapshot.docs.length === 0)
                break;
            
            lastDocRef.current = snapshot.docs[snapshot.docs.length - 1];
            numDocsToListenToRef.current += snapshot.docs.length;
            
            let priceFrom = null,
                priceTo = null;

            if (varExists(PRICE_FROM))
                priceFrom = getVar(PRICE_FROM);
            if (varExists(PRICE_TO))
                priceTo = getVar(PRICE_TO);

            for (const index in snapshot.docs) {
                const snapshotDoc = snapshot.docs[index];

                if (listings.findIndex(doc=> (doc.docId === snapshotDoc.id)) >= 0)
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
        updateVar(LAST_DOC, lastDocRef.current);
        updateVar(NUMBER_OF_DOCS, numDocsToListenToRef.current);
        setListingsLoaded(true);
        setListings(updatedListings);
        setPagination(updatedListings.length);
    } // function loadListings()

    async function transFormListingData(listingSnapshot) {
    /**Add fields such as provinceName, municipalityName, mainPlaceName, subPlaceName, 
     * and currentPrice. Also convert Timestamp dates to Javascript dates. */
        const listing = listingSnapshot.data();
        listing.docId = listingSnapshot.id;
        
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
            municipality = getSortedObject(municipality);
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
            mainPlace = getSortedObject(mainPlace);
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
            subPlace = getSortedObject(subPlace);
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
        return getSortedObject(listing);
    } // async function transFormListingData(listing)

    useEffect(() => {
        async function call() {
            if (!varExists(NUMBER_OF_DOCS)) {
                addVar(NUMBER_OF_DOCS, 0);
                addVar(LAST_DOC, null);
                addVar(LISTINGS, []);
                load();
            } // if (!varExists(NUMBER_OF_DOCS))
            else { // Caters for situations where user returns to this page.
                if (varExists(QUERY_TIME) // This routing came from the Search page. Re-do the querying of data.
                    && getVar(QUERY_TIME) !== queryTimeRef.current) {
                    queryTimeRef.current = getVar(QUERY_TIME);
                    load();
                }
                else { // The routing did not come from the search page. No need to re-do the querying of data.
                    const prevListings = getVar(LISTINGS);
                    // In case of /explore/ route.
                    if (location.pathname.startsWith('/explore/')
                        && (!(params.provincialCode === prevListings[0].address.provincialCode
                            && params.municipalityCode === prevListings[0].address.municipalityCode
                            && params.mainPlaceCode === prevListings[0].address.mainPlaceCode))) {
                        load();                        
                    } // if (location.pathname.startsWith('/explore/')) {
                    else {
                        if (prevListings.length === 0)
                            load();
                        else {
                            setListings(prevListings);
                            setPagination(prevListings.length);
                            numDocsToListenToRef.current = getVar(NUMBER_OF_DOCS);
                            if (numDocsToListenToRef.current > 0) {
                                recreateQueryListener();
                                lastDocRef.current = getVar(LAST_DOC);
                            } // if (numDocsToListenToRef.current > 0)
                        }
                    } // else

                } // else
            } // else

            if (!varExists(CLICKED_LISTING))
                addVar(CLICKED_LISTING, null);
        } // async function call()   

        if (firstRenderRef.current === true) { // This is to prevent multiple re-renders/re-runs of the effect.
            setListingsLoaded(false);
            if (!varExists(GET_LISTINGS_QUERY_OBJECT)) {
                /** Handle situations in which the user did not start from any of the explore pages to get to this page.
                 * In this instance take the user to the appropriate explore page.
                 */
                if (location.pathname === '/offers/listings')
                    navigate('/offers');
                else if (location.pathname.startsWith('/explore/'))
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
                                    .filter((listing, index)=> 
                                        (
                                            (index >= (pageNum - 1) * numDocsToFetch)
                                                && (index < (pageNum * numDocsToFetch))
                                        )
                                    )
                                    .map(listing=> 
                                        (
                                            <NavLink onClick={e=> goToListing(listing)} key={listing.docId}>
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
                                                <NavLink className="w3-button" key={anInteger} style={(pageNum === anInteger)? selectedItemStyle : w3ThemeD5}
                                                    onClick={e=> (pageNum !== anInteger && setPageNum(anInteger))}>
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
                    {location.pathname !== '/my-profile/listings' &&
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
