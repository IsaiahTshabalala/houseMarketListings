/**
 * File: ./src/components/Reports.js
 * Description: Display reports by users, about listings with inappropriate content.
 * Let the moderator review the report and moderate the listing.
 * Date         Dev  Version  Description
 * 2024/05/09   ITA  1.00     Genesis
 */
import { getDocs, onSnapshot } from 'firebase/firestore';
import { QueryTypes, getReportsToReviewQuery, REPORTS, LAST_DOC,
         PROVINCES, MUNICIPALITIES, MAIN_PLACES, SUB_PLACES, getDocumentSnapshot,
         CLICKED_LISTING, getProvince, getMunicipality, getMainPlace, getSubPlace } from '../utilityFunctions/firestoreComms';
import { sharedVarsContext } from '../hooks/SharedVarsProvider';
import { useEffect, useRef, useState, useContext } from "react";
import { NavLink, useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import toastifyTheme from './toastifyTheme';
import Loader from './Loader';
import { w3ThemeD5, selectedItemStyle } from './moreStyles';
import { getSortedObject } from '../utilityFunctions/commonFunctions';

function Reports() {
    const navigate = useNavigate();
    const firstRenderRef = useRef(true); // To indicate if the component is rendering for the first time.
    const [reports, setReports] = useState([]);
    const [reportsKey, setReportsKey] = useState(1);
    const [loadingMessage, setLoadingMessage] = useState(null);
    const {varExists, addVar, getVar, updateVar} = useContext(sharedVarsContext);
    const lastDocRef = useRef(null); // The position after which to perform the next fetching of data from Firestore.
    const numDocsToListenToRef = useRef(0);
    const unsubscribeRef = useRef(null); // A listener for changes in Firestore, to the documents that were fetched.
    const [numPages, setNumPages] = useState(1);
    const [pageNum, setPageNum] = useState(1);
    const numDocsToFetch = 3;
    const listingIdsRef = useRef([]);

    function generateSeqArray(pageCount) {
        const anArray = [];
        for (let count = 1; count <= pageCount; count++)
            anArray.push(count);

        return anArray;
    } // function generateSeqArray(numPages) {
    
    function setPagination(numDisplay) {
        let pageCount = Math.ceil(numDisplay * 1.00 / numDocsToFetch);
        setNumPages(pageCount);

        if (pageNum > pageCount)
            setPageNum(pageCount);
    } // function setPagination(numDisplay) {

    function createQueryObject(queryType) {
        let qry = null;
        switch (queryType) {
            case QueryTypes.START_FROM_BEGINNING:
                qry = getReportsToReviewQuery(numDocsToListenToRef.current);
                break;
            case QueryTypes.START_AFTER_LAST_DOC:
                qry = getReportsToReviewQuery(numDocsToFetch, lastDocRef.current);        
            default:
                break;
        }        
        return qry;
    } // function createQueryObject(queryType) {

    async function load() {
        await loadReports();
        await recreateQueryListener();
    } // async function load()

    async function recreateQueryListener() {
        /* Create a listener to listen for listing updates in Firestore.
           First unsubscribe to the current listener if it exists.
        */
        unsubScribe();

        if (numDocsToListenToRef.current <= 0) // No reports so far. Nothing to listen to.
            return;

        const qry = createQueryObject(QueryTypes.START_FROM_BEGINNING);
        unsubscribeRef.current = onSnapshot(
                                    qry, 
                                    snapshot=> {
                                        setLoadingMessage('Loading reports. Please wait ...');
                                        let theReports = [...getVar(REPORTS)];
                                        const docChanges = snapshot.docChanges();
                                        for (const idx in docChanges) {
                                            const change = docChanges[idx];
                                            const aReport = change.doc.data();
                                            aReport.reportId = change.doc.id;
                                            const index = theReports.findIndex(doc=> doc.reportId === aReport.reportId);

                                            switch (change.type) {
                                                case 'added': case 'modified':
                                                    if (index >= 0)
                                                        theReports[index] = {...theReports[index], ...aReport};
                                                    else {
                                                        theReports.push(aReport);
                                                    } // else
                                                    break;
                                                case 'removed':
                                                    if (index >= 0)
                                                        theReports.splice(index, 1);
                                                    break;
                                                default:
                                                    break;
                                            } // switch(change.type)
                                        } // for (const idx in docChanges) {
                                        
                                        listingIdsRef.current = [];
                                        theReports = theReports.map(report=> {
                                            const idx = listingIdsRef.current.findIndex(listingId=> listingId === report.listingId);
                                            if (idx < 0)
                                                listingIdsRef.current.push(report.listingId);
                                            report.display = (idx < 0);
                                            return report;
                                        });

                                        numDocsToListenToRef.current = theReports.length;
                                        setReports([...theReports]);
                                        updateVar(REPORTS, [...theReports]);
                                        setPagination(listingIdsRef.current.length);
                                        setLoadingMessage(null);
                                        if (theReports.length === 1) {
                                            console.log(theReports);
                                            setReportsKey(reportsKey + 1);
                                        }
                                    }, // snapshot=> {
                                    error=> {
                                    }
                                ); // onSnapshot(
    } // async function recreateQueryListener() {
    
    async function loadReports() {
        try {
            setLoadingMessage('Loading reports. Please wait ...');
            const theReports = [];
            let counter = 0;
            let snapshotDocs = null;

            do {
                const qry = createQueryObject(QueryTypes.START_AFTER_LAST_DOC);
                const snapshot = await getDocs(qry);
                const snapshotDocs = snapshot.docs;
    
                if (snapshotDocs.length === 0)
                    break;
    
                numDocsToListenToRef.current += snapshotDocs.length;
                lastDocRef.current = snapshotDocs[snapshotDocs.length - 1];
                console.log(lastDocRef.current.id);
    
                for (const idx in snapshotDocs) {
                    const snapshotDoc = snapshotDocs[idx];
                    const theReport = {
                        ...snapshotDoc.data(),
                        reportId: snapshotDoc.id
                    };

                    // The aim is to display 1 report per listing.
                    const index = listingIdsRef.current.findIndex(listingId=> {
                        return (listingId === theReport.listingId);
                    });

                    if (index < 0) {
                        counter++;
                        listingIdsRef.current.push(theReport.listingId);
                    } // if (index < 0) {
                    
                    theReport.display = (index < 0);
                    
                    if (reports.findIndex(doc=> doc.reportId === theReport.reportId) < 0)
                        theReports.push(theReport);
                } // for (const idx in snapshotDocs) {                
            } while (counter <= numDocsToFetch + 1);

            if (snapshotDocs !== null && snapshotDocs.length > 0) {
                const reportData = reports.concat(theReports);
                setReports(reportData);
                setPagination(listingIdsRef.current.length);
                updateVar(REPORTS, reportData);
                updateVar(LAST_DOC, lastDocRef.current);                
            }
        } catch (error) {
            console.log(error);
            toast.error('Unable to load reports at this time.', toastifyTheme);
        }
        finally {
            setLoadingMessage(null);
        } // finally
    } // async function loadReports() {

    async function transformListingData(listingSnapshot) {
        /**Add fields such as provinceName, municipalityName, mainPlaceName, subPlaceName, 
         * and currentPrice. Also convert Firestore Timestamp dates to Javascript dates. */
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
    } // async function transformListingData(listingSnapshot)

    async function goToListing(listingId) {
        setLoadingMessage('Loading listing. Please wait ...');
        try {
            const snapshot = await getDocumentSnapshot(`/listings/${listingId}`);
            const listing = await transformListingData(snapshot);
            updateVar(CLICKED_LISTING, listing);
            navigate(`/moderation/${listingId}`);
        } catch (error) {
            setLoadingMessage(null);
            toast.error('This listing may have been flagged already', toastifyTheme);
        } // catch (error)
    } // function goToListing(listingId) {

    async function get() {
        if (firstRenderRef.current === true) {
            firstRenderRef.current = false;       

            if (!varExists(REPORTS)) {
                addVar(REPORTS, []);
                addVar(LAST_DOC, null); // Last report document fetched from Firestore.       
                addVar(CLICKED_LISTING, null);
                await load();
            } // if (!varExists(REPORTS)) {
            else {
                await load();
            } // else
        } // if (firstRenderRef.current === true) { 
    } // function get() {

    useEffect(() => {
        get();        

        // When this component dismounts, unsubscribe from listening for updates to report documents.
        return unsubScribe;
    }, []);

    function unsubScribe() {
        if (unsubscribeRef.current !== null)
            unsubscribeRef.current();        
    }

    return (
        <div className='w3-container' key={reportsKey}>
            {(loadingMessage === null)?
                <>
                    <h1>Reports</h1>
                        
                    <div>
                    {reports.length > 0?
                        <div className='w3-container'>
                            {
                                reports
                                .filter(doc=> (doc.display === true))
                                .filter((report, index)=> {
                                    return index >= (pageNum - 1) * numDocsToFetch
                                            && index < pageNum * numDocsToFetch;
                                })
                                .map(report=> {
                                    return (
                                        <NavLink key={report.reportId} onClick={e=> goToListing(report.listingId)}>
                                            <div className='w3-card w3-margin-right w3-margin-bottom w3-padding side-by-side'>                                        
                                                Listing ID: {report.listingId}<br/>
                                                {report.reason}
                                            </div>
                                        </NavLink>
                                    );
                                })
                            }                            
                            
                            {numPages > 1 &&
                                <div className="w3-bar w3-margin w3-centered">
                                    {
                                        generateSeqArray(numPages).map(anInteger=>
                                                (                                               
                                                    <NavLink  className="w3-button" key={anInteger} style={(pageNum === anInteger)? selectedItemStyle : w3ThemeD5}
                                                        onClick={e=> (pageNum !== anInteger? setPageNum(anInteger) : null)}>
                                                        {anInteger}
                                                    </NavLink>
                                                )
                                        )
                                    }
                                </div>
                            }
                        </div>
                        :
                        <p>There are no reports at this time.</p>
                    } 
                    </div>                         
                    {(pageNum === numPages) &&
                        <p key={reportsKey + 1}> 
                            <NavLink className="w3-button w3-round w3-theme-d5" onClick={e=> load()}>Load more...</NavLink>
                        </p>
                    }
                </>
                :
                <Loader message={loadingMessage}/>
            }
            <ToastContainer/>
        </div>
    );
}

export default Reports;
