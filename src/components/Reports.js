/**
 * File: ./src/components/Reports.js
 * Description: Display reports by users, about listings with inappropriate content.
 * Let the moderator review the report and moderate the listing.
 * Date         Dev  Version  Description
 * 2024/05/09   ITA  1.00     Genesis
 * 2024/07/14   ITA  1.02     Maximum number of documents fetched from Firestore settable in the environment variables. Default: 10.
 * 2024/09/19   ITA  1.03     Context to be imported directly.
 *                            Replace NavLinks with Links, since Links suffice for use as non-menu-item hyper-links.
 */
import { getDocs, onSnapshot } from 'firebase/firestore';
import { FetchTypes, getReportsToReviewQuery, VarNames, getDocumentSnapshot,
         transformListingData } from '../utilityFunctions/firestoreComms';
import { useSharedVarsContext } from '../hooks/SharedVarsProvider';
import { useEffect, useRef, useState } from "react";
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
    const {varExists, addVar, getVar, updateVar} = useSharedVarsContext();
    const lastDocRef = useRef(null); // The position after which to perform the next fetching of data from Firestore.
                                     // Listening also to happen from first report doc up to this doc.
    const unSubscribeRef = useRef(null); // A listener for changes in Firestore, to the documents that were fetched.
    const [numPages, setNumPages] = useState(1);
    const [pageNum, setPageNum] = useState(1);    
    const numDocsToFetch = (()=> {
        let numDocs = Number.parseInt(process.env.REACT_APP_NUM_DOCS_TO_FETCH);

        if (numDocs === undefined)
            numDocs = 10;
        else
            numDocs = Number.parseInt(numDocs);

        return numDocs;
    })();

    const sortFields = ['listingId asc', 'reportId asc'];  // Fetched listings are expected to be sorted by listingId, then reportId.
    const repsToDisplaySortFields = ['listingId asc'];

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
                                        let theReports = [...getVar(VarNames.REPORTS)];
                                        let repsToDisplay = [...getVar(VarNames.REPORTS_TO_DISPLAY)];
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
                                        updateVar(VarNames.REPORTS, [...theReports]);
                                        updateVar(VarNames.REPORTS_TO_DISPLAY, [...repsToDisplay]);
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

            updateVar(VarNames.REPORTS_TO_DISPLAY, [...repsToDisplay]);
            updateVar(VarNames.REPORTS, [...theReports]);
        } catch (error) {
            console.log(error);
            toast.error('Unable to load reports at this time.', toastifyTheme);
        }
        finally {
            setLoadingMessage(null);
        } // finally
    } // async function loadReports() {

    
    async function goToListing(listingId) {
        setLoadingMessage('Loading listing. Please wait ...');
        try {
            const snapshot = await getDocumentSnapshot(`/listings/${listingId}`);
            
            if (!varExists(VarNames.PROVINCES))
                addVar(VarNames.PROVINCES, []);
            if (!varExists(VarNames.MUNICIPALITIES))
                addVar(VarNames.MUNICIPALITIES, []);
            if (!varExists(VarNames.MAIN_PLACES))
                addVar(VarNames.MAIN_PLACES, []);
            if (!varExists(VarNames.SUB_PLACES))
                addVar(VarNames.SUB_PLACES, []);
            const listing = await transformListingData(getVar(VarNames.PROVINCES), getVar(VarNames.MUNICIPALITIES),
                                                        getVar(VarNames.MAIN_PLACES), getVar(VarNames.SUB_PLACES), snapshot);
            updateVar(VarNames.CLICKED_LISTING, listing);
            updateVar(VarNames.PAGE_NUM, pageNum);
            navigate(`/moderation/${listingId}`);
        } catch (error) {
            console.log(error);
            setLoadingMessage(null);
            toast.error('This listing may have been flagged already', toastifyTheme);
        } // catch (error)
    } // function goToListing(listingId) {    

    async function get() {
        if (firstRenderRef.current === true) {
            if (!varExists(VarNames.REPORTS)) {
                addVar(VarNames.REPORTS, []);
                addVar(VarNames.CLICKED_LISTING, null);
                addVar(VarNames.PAGE_NUM, 1);
                addVar(VarNames.REPORTS_TO_DISPLAY, []);
                await load();
            } // if (!varExists(VarNames.REPORTS)) {
            else {
                const prevReports = [...getVar(VarNames.REPORTS)];
                if (prevReports.length === 0)
                    await load();
                else {
                    reportsRef.current = prevReports;
                    const repsToDisplay = getObjArrayWithNoDuplicates(prevReports, true, ...repsToDisplaySortFields);
                    updateVar(VarNames.REPORTS_TO_DISPLAY, [...repsToDisplay]);
                    setReportsToDisplay([...repsToDisplay]);                    
                    setPageNum(getVar(VarNames.PAGE_NUM));
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
