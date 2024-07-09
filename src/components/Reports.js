/**
 * File: ./src/components/Reports.js
 * Description: Display reports by users, about listings with inappropriate content.
 * Let the moderator review the report and moderate the listing.
 * Date         Dev  Version  Description
 * 2024/05/09   ITA  1.00     Genesis
 */
import { getDocs, onSnapshot } from 'firebase/firestore';
import { FetchTypes, getReportsToReviewQuery, REPORTS,
         PROVINCES, MUNICIPALITIES, MAIN_PLACES, SUB_PLACES, getDocumentSnapshot,
         CLICKED_LISTING, getProvince, getMunicipality, getMainPlace, getSubPlace } from '../utilityFunctions/firestoreComms';
import { sharedVarsContext } from '../hooks/SharedVarsProvider';
import { useEffect, useRef, useState, useContext } from "react";
import { NavLink, useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import toastifyTheme from './toastifyTheme';
import Loader from './Loader';
import { w3ThemeD5, selectedItemStyle } from './moreStyles';
import { binarySearchObj, objCompare, getObjArrayWithNoDuplicates } from '../utilityFunctions/commonFunctions';

function Reports() {
    const navigate = useNavigate();
    const firstRenderRef = useRef(true); // To indicate if the component is rendering for the first time.
    const reportsRef = useRef([]);
    const [reportsToDisplay, setReportsToDisplay] = useState([]);
    const [loadingMessage, setLoadingMessage] = useState(null);
    const {varExists, addVar, getVar, updateVar} = useContext(sharedVarsContext);
    const lastDocRef = useRef(null); // The position after which to perform the next fetching of data from Firestore.
                                     // Listening also to happen from first report doc up to this doc.
    const unSubscribeRef = useRef(null); // A listener for changes in Firestore, to the documents that were fetched.
    const [numPages, setNumPages] = useState(1);
    const [pageNum, setPageNum] = useState(1);
    const numDocsToFetch = 3;
    const sortFields = ['listingId asc', 'reportId asc'];  // Fetched listings are expected to be sorted by listingId, then reportId.
    const repsToDisplaySortFields = ['listingId asc'];
    const PAGE_NUM = 'pageNumber';
    const REPORTS_TO_DISPLAY = 'reportsToDisplay';

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

    function createQueryObject(fetchType = null) {
        let qry = null;
        if (fetchType === FetchTypes.END_AT_DOC)         
            qry = getReportsToReviewQuery(null, lastDocRef.current, fetchType);
        else if (fetchType === FetchTypes.START_AFTER_DOC)
            qry = getReportsToReviewQuery(numDocsToFetch, lastDocRef.current, fetchType);        
        else if (fetchType === null)
            qry = getReportsToReviewQuery(numDocsToFetch);
        return qry;
    } // function createQueryObject(fetchType) {

    async function load() {
        await loadReports();
        await recreateQueryListener();
    } // async function load()

    /* Create a listener to listen for listing updates in Firestore.
        First unSubscribe to the current listener if it exists.
    */
    async function recreateQueryListener() {
        unSubscribe();

        if (lastDocRef.current === null) // No documents to listen to.
            return;

        const qry = createQueryObject(FetchTypes.START_FROM_BEGINNING);
        unSubscribeRef.current = onSnapshot(
                                    qry, 
                                    async snapshot=> {
                                        setLoadingMessage('Loading reports. Please wait ...');
                                        let theReports = [...getVar(REPORTS)];
                                        let repsToDisplay = [...getVar(REPORTS_TO_DISPLAY)];
                                        const docChanges = snapshot.docChanges();
                                        for (const idx in docChanges) {
                                            const change = docChanges[idx];
                                            const aReport = change.doc.data();
                                            aReport.reportId = change.doc.id;
                                            
                                            /* Find in theReports the position of the report doc that changed, or the position where the new report doc
                                                should be, or where a report doc should be removed. Update the reportsToDisplay accordingly.
                                            */
                                            const index = binarySearchObj(theReports, aReport, 0, ...sortFields); // sortFields = ['listingId asc', 'reportId asc']
                                            let comparison = null;
                                            if (index >= 0) // non-empty array.
                                                comparison = objCompare(theReports[index], aReport, ...sortFields);

                                            const index2 = binarySearchObj(repsToDisplay, aReport, 0, ...repsToDisplaySortFields); // repsToDisplaySortFields = ['listingId']
                                            let comparison2 = null;
                                            if (index >= 0) // non-empty array.
                                                comparison2 = objCompare(repsToDisplay[index2], aReport, ...repsToDisplaySortFields);

                                            switch (change.type) {
                                                case 'added': case 'modified':
                                                    if (index < 0)
                                                        theReports.push(aReport);
                                                    else if (comparison === 0) { // aReport found in theReports. Update at index.
                                                        theReports[index] = aReport;
                                                    } // if (comparison === 0) {
                                                    else if (comparison < 0) { // New report insert at the right position in theReports, in accordance with sort order.

                                                        // Place after theReports[index]
                                                        if (index + 1 <= theReports.length - 1)
                                                            theReports.splice(index + 1, 0, aReport);
                                                        else
                                                            theReports.push(aReport);
                                                    }
                                                    else { // comparison > 0
                                                        // Place before theReports[index]
                                                        theReports.splice(index, 0, aReport);
                                                    }

                                                    if (index2 < 0)
                                                        repsToDisplay.push(aReport);
                                                    else if (comparison2 < 0) {
                                                        if (index2 + 1 < repsToDisplay.length)
                                                            repsToDisplay.splice(index2 + 1, 0, aReport);
                                                        else
                                                            repsToDisplay.push(aReport);
                                                    } // if (comparison2 < 0) {
                                                    else if (comparison2 > 0) {
                                                        repsToDisplay.splice(index2, 0, aReport);
                                                    } // else if (comparison2 > 0) {
                                                    break;
                                                case 'removed':
                                                    if (comparison === 0)
                                                        theReports.splice(index, 1);

                                                    if (comparison2 === 0) {
                                                        /**Remove the report from repsToDisplay as well, and replace it with
                                                         * another report of same listingId, if available. */
                                                        const index3 = binarySearchObj(theReports, aReport, 0, ...repsToDisplaySortFields);
                                                        if (index3 < 0) {
                                                            // Nothing to do.
                                                        }
                                                        if (objCompare(theReports[index3], aReport, ...repsToDisplaySortFields) === 0)
                                                            repsToDisplay[index2] = aReport; // replacement.
                                                        else
                                                            repsToDisplay.splice(index2, 1);
                                                    } // if (comparison2 === 0) {
                                                    break;
                                                default:
                                                    break;
                                            } // switch(change.type)
                                        } // for (const idx in docChanges) {

                                        setReportsToDisplay(repsToDisplay);
                                        updateVar(REPORTS, [...theReports]);
                                        updateVar(REPORTS_TO_DISPLAY, [...repsToDisplay]);
                                        reportsRef.current = [...theReports];
                                        
                                        setReportsToDisplay(repsToDisplay);                                        
                                        setPagination(repsToDisplay.length);

                                        lastDocRef.current = null;
                                        if (theReports.length > 0) {
                                            const lastReport = theReports[theReports.length - 1];
                                            lastDocRef.current = await getDocumentSnapshot(`/listings/${lastReport.listingId}/reports/${lastReport.reportId}`);
                                        } // if (theReports.length > 0) {
                                        setLoadingMessage(null);
                                    }, // snapshot=> {
                                    error=> {
                                    }
                                ); // onSnapshot(
    } // async function recreateQueryListener() {
    
    async function loadReports() {
        try {
            setLoadingMessage('Loading reports. Please wait ...');
            const theReports = [...reportsRef.current];
            const repsToDisplay = [...reportsToDisplay];
            let counter = 0;
            do {
                let qry;
                if (lastDocRef.current === null)
                    qry = createQueryObject();
                else
                    qry = createQueryObject(FetchTypes.START_AFTER_DOC);

                const snapshot = await getDocs(qry);
                const snapshotDocs = snapshot.docs;
    
                if (snapshotDocs.length === 0)
                    break;
    
                lastDocRef.current = snapshotDocs[snapshotDocs.length - 1];
    
                for (const idx in snapshotDocs) {
                    const snapshotDoc = snapshotDocs[idx];
                    const theReport = {
                        ...snapshotDoc.data(),
                        reportId: snapshotDoc.id
                    };

                    // The aim is to display 1 report per listing.
                    if (repsToDisplay.length === 0) {
                        repsToDisplay.push(theReport);
                        counter++;
                    }
                    else {
                        const index = binarySearchObj(repsToDisplay, theReport, 0, ...repsToDisplaySortFields);
                        
                        const comparison = objCompare(repsToDisplay[index], theReport, ...repsToDisplaySortFields);
                        if (comparison < 0) {
                            // Add theReport to the right of repsToDisplay[index]
                            if (index + 1 < repsToDisplay.length)
                                repsToDisplay.splice(index + 1, 0, theReport);
                            else
                                repsToDisplay.push(theReport);

                            counter++;
                        } // if (comparison > 0) {
                        else if (comparison > 0) { // Place theReport to the left of repsToDisplay[index]
                            repsToDisplay.splice(index, 0, theReport);
                            counter++;
                        } // else if (comparison < 0) {
                    } // else

                    theReports.push(theReport);
                } // for (const idx in snapshotDocs) {                
            } while (counter < numDocsToFetch);

            updateVar(REPORTS_TO_DISPLAY, [...repsToDisplay]);
            updateVar(REPORTS, [...theReports]);
        } catch (error) {
            console.log(error);
            toast.error('Unable to load reports at this time.', toastifyTheme);
        }
        finally {
            setLoadingMessage(null);
        } // finally
    } // async function loadReports() {

    
    /**To the listing snapshot fields such as provinceName, municipalityName, mainPlaceName, subPlaceName, 
     * and currentPrice. Also convert Firestore Timestamp dates to Javascript dates. */
    async function transformListingData(listingSnapshot) {
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
    } // async function transformListingData(listingSnapshot)

    async function goToListing(listingId) {
        setLoadingMessage('Loading listing. Please wait ...');
        try {
            const snapshot = await getDocumentSnapshot(`/listings/${listingId}`);
            const listing = await transformListingData(snapshot);
            updateVar(CLICKED_LISTING, listing);
            updateVar(PAGE_NUM, pageNum);
            navigate(`/moderation/${listingId}`);
        } catch (error) {
            console.log(error);
            setLoadingMessage(null);
            toast.error('This listing may have been flagged already', toastifyTheme);
        } // catch (error)
    } // function goToListing(listingId) {    

    async function get() {
        if (firstRenderRef.current === true) {
            if (!varExists(REPORTS)) {
                addVar(REPORTS, []);
                addVar(CLICKED_LISTING, null);
                addVar(PAGE_NUM, 1);
                addVar(REPORTS_TO_DISPLAY, []);
                await load();
            } // if (!varExists(REPORTS)) {
            else {
                const prevReports = [...getVar(REPORTS)];
                if (prevReports.length === 0)
                    await load();
                else {
                    reportsRef.current = prevReports;
                    const repsToDisplay = getObjArrayWithNoDuplicates(prevReports, true, ...repsToDisplaySortFields);
                    updateVar(REPORTS_TO_DISPLAY, [...repsToDisplay]);
                    setReportsToDisplay([...repsToDisplay]);                    
                    setPageNum(getVar(PAGE_NUM));
                    setPagination(repsToDisplay.length);
                    
                    const lastReport = prevReports[prevReports.length - 1];                                                                                  
                    lastDocRef.current = await getDocumentSnapshot(`/listings/${lastReport.listingId}/reports/${lastReport.reportId}`);

                    recreateQueryListener();
                } // else
            } // else
            firstRenderRef.current = false;
        } // if (firstRenderRef.current === true) { 
    } // function get() {

    useEffect(() => {
        get();        

        // When this component dismounts, unSubscribe from listening for updates to report documents.
        return ()=> {
            unSubscribe();
        }
    }, []);

    function unSubscribe() {
        if (unSubscribeRef.current !== null)
            unSubscribeRef.current();        
    }

    return (
        <div className='w3-container'>
            {(loadingMessage === null)?
                <>
                    <h1>Reports</h1>
                        
                    <div>
                    {reportsToDisplay.length > 0?
                        <div className='w3-container'>
                            {
                                reportsToDisplay
                                .slice((pageNum - 1) * numDocsToFetch, pageNum * numDocsToFetch)
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
                                                    <NavLink  className="w3-btn w3-round" key={anInteger} style={(pageNum === anInteger)? selectedItemStyle : w3ThemeD5}
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
                        <p> 
                            <NavLink className="w3-btn w3-round w3-theme-d5" onClick={e=> load()}>Load more...</NavLink>
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
