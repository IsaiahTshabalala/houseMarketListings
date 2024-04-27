/**
 * File: '../src/components/Listings.js'
 * Purpose: Display thumbnails of listings.
 * 
 * Date         Dev     Description
 * 2024/01/27   ITA     Genesis.
 */
import { useState, useRef, useEffect, useContext, useMemo } from 'react';
import { CLICKED_LISTING, GET_LISTINGS_QUERY_OBJECT, PROVINCES, MUNICIPALITIES,
         MAIN_PLACES, SUB_PLACES, TRANSACTION_TYPES, PROPERTY_TYPES,
         NUMBER_OF_BEDROOMS, PRICE_FROM, PRICE_TO,
         getProvince, getMunicipality, getMainPlace, getSubPlace, getDocument,
         LISTINGS,
         QUERY_TIME} from '../utilityFunctions/firestoreComms';
import { onSnapshot, getDocs } from 'firebase/firestore';
import { toZarCurrencyFormat, getSortedObject } from '../utilityFunctions/commonFunctions';
import { sharedVarsContext } from '../hooks/SharedVarsProvider';
import { FaBed, FaBath, FaRulerCombined, FaCar, FaLandmark } from "react-icons/fa";
import { GiHomeGarage } from "react-icons/gi";
import { toast, ToastContainer } from 'react-toastify';
import toastifyTheme from './toastifyTheme';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import Loader from './Loader';
import { userContext } from '../hooks/UserProvider';

function Listings() {
    const { getVar, addVar, updateVar, varExists} = useContext(sharedVarsContext);
    const { currentUser } = useContext(userContext);
    const [listings, setListings] = useState([]);
    const [listingsLoaded, setListingsLoaded] = useState(true);
    const firstRenderRef = useRef(true);
    const lastDocRef = useRef(null);
    const unsubscribeRef = useRef(null);
    const numDocsToListenToRef = useRef(0);
    const navigate = useNavigate();
    const location = useLocation();
    const numDocsToFetch = 3;
    const [noMoreDocs, setNoMoreDocs] = useState(false);
    const [listingsKey, setListingsKey] = useState(Math.random());
    const [noMoreDocsKey, setNomoreDocsKey] = useState(Math.random());
    const keyStep = 0.0000000000000001;
    const queryTimeRef = useRef(0);

    const backTo = (()=> {        
        let returnTo = {
            link: '#',
            text: ''
        };
        switch (location.pathname) {
            case '/listings':
                returnTo.link = '/';
                returnTo.text = 'Back to Search for Listings'
                break;
            case '/offers/listings':
                returnTo.link = '/offers';
                returnTo.text = 'Back to Search for Offers';
                break;
            case '/explore/listings':
                returnTo.link = '/Explore';
                returnTo.text = 'Back to Search for Explore';
                break;
            default:
                break;
        } // switch (location.pathname)
        return returnTo;
    })();

    const QueryTypes = Object.freeze({
        START_FROM_BEGINNING: 1, // Query from the beginning of the listings collection.
        START_AFTER_LAST_DOC: 2 // Query after a specified document.
    });
    const NUMBER_OF_DOCS = 'numberOfDocuments'; // The current number of documents that are being listened to.
    const LAST_DOC = 'lastDocument'; // The last document that was retrieved from Firestore.

    function goToListing(listing) {
        if (listing === null)
            return;

        updateVar(CLICKED_LISTING, listing);

        let path = location.pathname;
        navigate(`${path}/${listing.docId}`);
    } // function goToListing(listing) {

    function createQuery(queryType) {        
        let qry = null;
        const functionGetQueryObject = getVar(GET_LISTINGS_QUERY_OBJECT);
        if (location.pathname === `/my-profile/listings`) {
            if (queryType === QueryTypes.START_AFTER_LAST_DOC)
                qry = functionGetQueryObject(currentUser.uid, numDocsToFetch, lastDocRef.current);
            else if (queryType === QueryTypes.START_FROM_BEGINNING)
                qry = functionGetQueryObject(currentUser.uid, numDocsToListenToRef.current);
        }
        else if (['/listings', '/offers/listings'].includes(location.pathname)) {
            /**Shared vars must have been provided via the SearchListings component. */
            if (varExists(MAIN_PLACES)) {
                const mainPlaces = getVar(MAIN_PLACES);
                const transactionTypes = getVar(TRANSACTION_TYPES);
                const propertyTypes = getVar(PROPERTY_TYPES);
                const numberOfBedrooms = getVar(NUMBER_OF_BEDROOMS);

                if (location.pathname === '/offers/listings') {
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
        return qry;
    } // function createQuery() {

    function recreateQueryListener() {
        // Create a listener to listen for listing updates in Firestore.
        // First unsubscribe to the current listener if it exists.
        if (unsubscribeRef.current !== null)
            unsubscribeRef.current();
        if (numDocsToListenToRef.current <= 0) // No listings so far. Nothing to listen to.
            return;

        
        const qry = createQuery(QueryTypes.START_FROM_BEGINNING);
        let priceFrom = null,
            priceTo = null;
        
        if (varExists(PRICE_FROM))
            priceFrom = getVar(PRICE_FROM);
        if (varExists(PRICE_TO))
            priceTo = getVar(PRICE_TO);

        let theListings = listings;
        unsubscribeRef.current = onSnapshot(
                                    qry, 
                                    snapshot=> {
                                        snapshot.docChanges().forEach(async change=> {                      
                                            const aListing = await transFormListingData(change.doc);
                                            let index = theListings.findIndex(doc=> {
                                                return doc.docId === aListing.docId;
                                            });
                                            let allowed = true;

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
                                                        else
                                                            theListings.push(aListing);
                                                    } // if (allowed)
                                                    else {
                                                        if (index >= 0)
                                                            theListings = theListings.slice(index, index + 1);
                                                    }
                                                    break;
                                                case 'removed':
                                                    if (index >= 0)
                                                        theListings = theListings.slice(index, index + 1);
                                                    break;
                                                default:
                                                    break;
                                            } // switch(change.type)
                                        }); // snapshot.docChanges().forEach(async change=> {
                                        
                                        setListings(prev=> theListings);
                                        updateVar(LISTINGS, theListings);
                                        setListingsKey(listingsKey + keyStep);
                                    },
                                    error=> {
                                    }
                                );
    } // function createQueryListener() {

    async function load() {
        await loadListings();
        recreateQueryListener();
    } // function load() {

    async function loadListings() {
        setListingsLoaded(false);

        let theListings = [];

        do {
            const qry = createQuery(QueryTypes.START_AFTER_LAST_DOC);
            const snapshots = await getDocs(qry); // Execute the query and return the results (document snapshots).
    
            let snapshotDocs = snapshots.docs;

            setNoMoreDocs(snapshotDocs.length === 0);
            if (snapshotDocs.length === 0) {
                console.log(noMoreDocs);
                break;
            } // if (snapshotDocs.length === 0) {

            lastDocRef.current = snapshots.docs[snapshots.docs.length - 1];
            updateVar(LAST_DOC, lastDocRef.current);
            numDocsToListenToRef.current += snapshots.docs.length;
            updateVar(NUMBER_OF_DOCS, numDocsToListenToRef.current);
            
            let priceFrom = null,
                priceTo = null;

            if (varExists(PRICE_FROM))
                priceFrom = getVar(PRICE_FROM);
            if (varExists(PRICE_TO))
                priceTo = getVar(PRICE_TO);

            for (const index in snapshotDocs) {
                const myListing = await transFormListingData(snapshotDocs[index]);
                
                let addListing = true;
                
                // Given the Firestore limitations, the price range filters could not be added to the query.
                // The solution is to filter according to the scheme below.
                if (priceFrom !== null)
                    addListing = (myListing.currentPrice >= priceFrom);
                if (priceFrom !== null)
                    addListing = addListing && (myListing.currentPrice <= priceTo);

                if (addListing) {
                    theListings.push(myListing);
                }
            } // for (const index in snapshotDocs) {

        } while (theListings.length < numDocsToFetch);

        updateVar(LISTINGS, listings.concat(theListings));
        firstRenderRef.current = true;
        setListingsLoaded(true);
    } // function loadListings()

    async function transFormListingData(listingSnapshot) {
    /**Add fields such as provinceName, municipalityName, mainPlaceName, subPlaceName, 
     * and currentPrice. Also convert Timestamp dates to Javascript dates. */
        const exists = varExists(PROVINCES);
        const listing = listingSnapshot.data();
        listing.docId = listingSnapshot.id;
        // The routes /listings and /listings/offers already have the provinces, municipalities, and main places shared variables set.
        if (!exists) {
            addVar(PROVINCES, []);
            addVar(MUNICIPALITIES, []);
            addVar(MAIN_PLACES, []);
        } // if (!exists) {
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
        if (firstRenderRef.current === true) { // This is to prevent multiple re-renders/re-runs of the effect.
            if (!varExists(GET_LISTINGS_QUERY_OBJECT)) {
                /** Handle situations in which the user did not start from any of the explore pages to get to this page.
                 * In this instance take the user to the appropriate explore page.
                 */
                switch (location.pathname) {
                    case '/listings':
                        navigate('/');
                        break;
                    case '/offers/listings':
                        navigate('/offers');
                        break;               
                    default:
                        break;
                } // switch (location.pathname)
            }
            else
                call();
        }
        firstRenderRef.current = false;

        async function call() {
            if (!varExists(NUMBER_OF_DOCS)) {                
                addVar(NUMBER_OF_DOCS, 0);
                addVar(LAST_DOC, null);
                addVar(LISTINGS, []);
                load();
            } // if (!varExists(NUMBER_OF_DOCS))
            else {
                if (varExists(QUERY_TIME) // This routing came from the Search page. Re-do the querying of data.
                    && getVar(QUERY_TIME) !== queryTimeRef.current) {
                    queryTimeRef.current = getVar(QUERY_TIME);
                    load();
                }
                else { // The routing did not come from the search page. No need to re-do the querying of data.
                    setListingsLoaded(false);
                    setListings(prev=> getVar(LISTINGS));
                    numDocsToListenToRef.current = getVar(NUMBER_OF_DOCS);
                    if (numDocsToListenToRef.current > 0) {
                        recreateQueryListener(QueryTypes.START_FROM_BEGINNING);
                        lastDocRef.current = getVar(LAST_DOC);
                    } // if (numDocsToListenToRef.current > 0)
                    setListingsLoaded(true);
                } // else
            } // else
    
            if (!varExists(CLICKED_LISTING))
                addVar(CLICKED_LISTING, null);
        } // async function call()        
        
        // When the component dismounts, unsubscribe from listening for listing data updates.
        return ()=> {
            if (unsubscribeRef.current !== null)
                unsubscribeRef.current();
        }
    }, [firstRenderRef.current]); // useEffect(() => {

    return (
        <div className='w3-container'>            
            {listingsLoaded === false?
                <Loader message={'Loading listings. Please wait...'}/>
                :
                <div  key={listingsKey}>
                    {listings.length > 0?
                        <>
                            <div className='w3-container' style={{overflowX: 'auto'}}>
                                {
                                    listings.map(listing=> {
                                        return (
                                            <NavLink onClick={e=> goToListing(listing)} key={listing.docId}>
                                                <div className="w3-card-4 w3-margin-right w3-margin-top"
                                                    style={{width: '250px', height: 'fit-content', display: 'inline-block', verticalAlign: 'top'}}>
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
                                        );
                                    })
                                }
                            </div>

                            <div key={noMoreDocsKey}>
                                {(noMoreDocs === false) &&
                                    <NavLink onClick={e=> load()}>Load more...</NavLink>
                                }
                            </div>
                        </>
                        :
                        <>
                            <p>
                                No listings for your search criteria!
                            </p>

                            <p>
                                <NavLink to={backTo.link}>{backTo.text}</NavLink>
                            </p>
                        </>
                    }
                </div>
            }
                
            <ToastContainer/>
        </div>
    );
}

export default Listings;
