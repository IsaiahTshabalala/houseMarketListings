/**
 * File: ./components/ReportOrFlag.js
 * Description: Component to enable user to report or flag (moderators only) a listing.
 * Placed inside the Listing component.
 * 
 * Date         Dev  Version  Description
 * 2024/05/23   ITA  1.00     Genesis.
 * 2024/07/09   ITA  1.01     REPORT THIS LISTING option to disappear if the listing has been reported.
 * 2024/09/18   ITA  1.01     Import context directly.
 */
import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { FaFlag, FaCheck, FaTimes, FaTimesCircle } from 'react-icons/fa';
import { MdOutlineReportProblem } from "react-icons/md";
import { toast, ToastContainer } from 'react-toastify';
import toastifyTheme from "./toastifyTheme";
import { addDoc, collection, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db, isModerator } from '../config/appConfig';
import { VarNames } from "../utilityFunctions/firestoreComms";
import { useSharedVarsContext } from "../hooks/SharedVarsProvider";
import { useGlobalStateContext } from "../hooks/GlobalStateProvider";
import Loader from "./Loader";
import { binarySearch, compare } from "../utilityFunctions/commonFunctions";

function ReportOrFlag() {
    const {varExists, getVar, updateVar, addVar} = useSharedVarsContext();
    const {getSlice} = useGlobalStateContext();
    const {currentUser} = useState(getSlice('authCurrentUser'));
    const [modalOn, setModalOn] = useState(false);
    const [isReported, setIsReported] = useState(false);
    const reportingReasons = ['Hate speech', 'Threatening / Violence', 'Graphic or Disturbing Content',
                              'Fraud / Scam', 'Spam',  'Drugs', 'Sex or Adult Content', 'Other'].sort();
    const [reportingReason, setReportingReason] = useState(reportingReasons[0]);
    const [listing, setListing] = useState(getVar(VarNames.CLICKED_LISTING));    
    const [ flagged, setFlagged] = useState(null);
    const [submitted, setSubmitted] = useState(true);
    const location = useLocation();
    const REPORTED_LISTINGS = 'reportedListings';

    const moderator = useState(()=> {
        return (async ()=> {
            return await isModerator();
        })();
    });

    async function submitReview(e) {
        let flagListing = null;
        if (e.target.value === 'true')
            flagListing = true;
        else if (e.target.value === 'false')
            flagListing = false;
        else
            return;

        setSubmitted(false);
        let listingUpdate = null;
        
        let listingFlagged = flagged;
        if (listingFlagged === null)
            listingFlagged = listing.flagged;
        if (flagListing !== listingFlagged) {
            // Flag a listing that has a status of flagged = false. Or unflag a listing that has a status of flagged = true.
            try {
                const docRef = doc(db, `/listings/${listing.listingId}`);
                await updateDoc(docRef, { flagged: flagListing});
                toast.success(`${flagListing? 'Listing flagged.' : 'Listing unflagged.'}`, toastifyTheme);
                listingUpdate = {...listing, flagged: flagListing};
                setListing(listingUpdate);
                updateVar(VarNames.CLICKED_LISTING, listingUpdate);
            } catch (error) {
                console.log(error);
                toast.error(`Could not ${flagListing? 'flag' : 'unflag'} listing at this time.`);
            } // catch (error) {
        } // if (flagListing && listing.flagged === false) {
    
        try {
            // Slice out the reports on this listing, and update them according to the listing review result.
            let reports = null;
            if (varExists(VarNames.REPORTS)) {
                reports = getVar(VarNames.REPORTS).filter(report=> {
                    return report.listingId === listing.listingId;
                });
                let listingReports = reports.filter(report=> report.listingId === listing.listingId);
                
                for (const index in listingReports) {
                    const report = listingReports[index];
                    const repDocRef = doc(db, `/listings/${listing.listingId}/reports/${report.reportId}`);

                    let outcome = {
                        reviewed: true,
                        reviewDate: Timestamp.fromDate(new Date()),
                        moderatorId: currentUser.uid,
                        result: (flagListing? 'flagged' : 'not flagged')
                    };

                    report.reviewed = true;
                    await updateDoc(repDocRef, outcome);
                } // for (const next in listingReports) {                

                if (listingReports.length > 0) {
                    toast.success('Review submitted!', toastifyTheme);
                    updateVar(VarNames.REPORTS, reports.filter(report=> (report.listingId !== listing.listingId)));
                } // if (listingReports.length > 0) {
            }
        } catch (error) {
            console.log(error);
            toast.error('Submission of review encountered some problems. Please try again.', toastifyTheme);
        } //  catch (error) {

        setFlagged(flagListing);
        setSubmitted(true);
    } // async function submitReview() {

    useEffect(()=> {
        if (!varExists(REPORTED_LISTINGS)) {
            addVar(VarNames.REPORTED_LISTINGS, []);
        } // if (!varExists(REPORTED_LISTINGS)) {
        else {
            const repListings = [...getVar(VarNames.REPORTED_LISTINGS)];
            const index = repListings.findIndex(repListing=> (repListing === listing.listingId));
            setIsReported(index >= 0); // The listing has been reported.
        } // else
    }, []); // useEffect(()=> { 

    async function submitReport() {
        setModalOn(false);
        setSubmitted(false);
        const reportData = {
            listingId: listing.listingId,
            reason: reportingReason, 
            reviewed: false
        };

        if (currentUser?.authCurrentUser?.uid !== undefined)
            reportData.userId = currentUser?.authCurrentUser?.uid;

        const docRef = collection(db, `/listings/${listing.listingId}/reports/`);
        try {
            await addDoc(docRef, reportData);
            const repListings = [...getVar(VarNames.REPORTED_LISTINGS)];
            const index = binarySearch(repListings, listing.listingId, 0, 'asc');
            let comparison = null;
    
            if (index >= 0) {
                comparison = compare(repListings[index], listing.listingId, 'asc');
                if (comparison < 0) // Insert to the left of repListings[index]
                    repListings.splice(index, 0, listing.listingId);
                else if (comparison > 0) {  // Insert to the right of repListings[index]
                    if (index + 1 < repListings.length)
                        repListings.splice(index + 1, 0, listing.listingId);
                    else
                        repListings.push(listing.listingId);
                } // else if (comparison > 0)
            } // if (index >= 0) {
            else
                repListings.push(listing.listingId);
    
            setIsReported(true);            
            updateVar(VarNames.REPORTED_LISTINGS, repListings);                
    
            toast.success('Thank you for your report. This listing will be reviewed and appropriate action taken.',
                            toastifyTheme);
        } catch (error) {
            toast.error('Could not submit your report at this time. Please try again.', toastifyTheme);
        }
        setSubmitted(true);
    } // async function submitReport()
    
    return (
        <>
            {(moderator && location.pathname.startsWith('/moderation'))?
                <>
                    {submitted?
                        <div>                        
                            <span className='side-by-side w3-xlarge'><FaFlag/></span> Flag this listing?
                            <div className='side-by-side'>
                                <input className='w3-margin-left w3-input-theme-1' type='radio' name='flagging' 
                                        value={true} onChange={submitReview} checked={flagged === true}/>
                                <label><FaCheck/>Yes</label>
    
                                <input className='w3-margin-left w3-input-theme-1' type='radio' name='flagging'
                                        value={false} onChange={submitReview} checked={flagged === false}/>
                                <label><FaTimes/>No</label>
                            </div>
                        </div>
                        :
                        <Loader small={true} message='Submitting review. Please wait ...'/>
                    }
                </>
                :
                <>
                    {(listing.userId !== currentUser?.authCurrentUser?.uid
                        && (!isReported)) &&

                        <>
                            {submitted?                                
                                
                                <NavLink className='w3-btn w3-round w3-theme-d5' onClick={e=> setModalOn(true)}>
                                    <span><MdOutlineReportProblem/></span> Report this listing
                                </NavLink>
                                :
                                <Loader small={true} message='Submitting report. Please wait ...'/>
                            }
                        </>
                    }
                        
                    <div id='id01' className='w3-modal' style={{display: modalOn? 'block': 'none'}}>
                        <div className='w3-modal-content'>
                            <div className='w3-container w3-theme'>
                                <span onClick={e=>  setModalOn(false)} className='w3-button w3-display-topright'><FaTimesCircle/></span>
                                <h4>
                                    What is in  this listing?
                                </h4>
                                
                                <select className='w3-input-theme-1' onChange={e=> setReportingReason(e.target.value)}>
                                    {
                                        reportingReasons.map(reason=> {
                                            return (
                                                <option className='w3-input-theme-1 w3-input' value={reason}
                                                    key={reason}>
                                                    {reason}
                                                </option>
                                            )
                                        })
                                    }
                                </select>
                                
                                <div className='w3-padding'>
                                    <button className='w3-btn w3-margin-small w3-theme-d5 w3-round' type='button'
                                            onClick={e=> submitReport()}>Submit Report</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>                
            }
            <ToastContainer/>
        </>
    );
} // function ReportOrFlag() {

export default ReportOrFlag;