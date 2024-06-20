/**
 * File: ./components/ReportOrFlag.js
 * Description: Component to enable user to report or flag (moderators only) a listing.
 * Placed inside the Listing component.
 * 
 * Date         Dev  Version  Description
 * 2024/05/23   ITA  1.00     Genesis.
 */
import { useContext, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { FaFlag, FaCheck, FaTimes, FaTimesCircle } from 'react-icons/fa';
import { MdOutlineReportProblem } from "react-icons/md";
import { toast, ToastContainer } from 'react-toastify';
import toastifyTheme from "./toastifyTheme";
import { addDoc, collection, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db, isModerator } from '../config/appConfig';
import { REPORTS, CLICKED_LISTING } from "../utilityFunctions/firestoreComms";
import { sharedVarsContext } from "../hooks/SharedVarsProvider";
import { userContext } from "../hooks/UserProvider";
import Loader from "./Loader";

function ReportOrFlag() {
    const {varExists, getVar, updateVar} = useContext(sharedVarsContext);
    const {currentUser} = useContext(userContext);
    const [modalOn, setModalOn] = useState(false);
    const reportingReasons = ['Hate speech', 'Threatening / Violence', 'Graphic or Disturbing Content',
                              'Fraud / Scam', 'Spam',  'Drugs', 'Sex or Adult Content'].sort().concat(['Other']);
    const [reportingReason, setReportingReason] = useState(reportingReasons[0]);
    const [listing, setListing] = useState(getVar(CLICKED_LISTING));    
    const [ flagged, setFlagged] = useState(null);
    const [submitted, setSubmitted] = useState(true);
    const location = useLocation();

    const moderator = useState(()=> {
        return (async ()=> {
            return await isModerator();
        })();
    }, []); // const moderator = useMemo(()=> {

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
                const docRef = doc(db, `/listings/${listing.docId}`);
                await updateDoc(docRef, { flagged: flagListing});
                toast.success(`${flagListing? 'Listing flagged.' : 'Listing unflagged.'}`, toastifyTheme);
                listingUpdate = {...listing, flagged: flagListing};
                setListing(listingUpdate);
                updateVar(CLICKED_LISTING, listingUpdate);
            } catch (error) {
                console.log(error);
                toast.error(`Could not ${flagListing? 'flag' : 'unflag'} listing at this time.`);
            } // catch (error) {
        } // if (flagListing && listing.flagged === false) {
    
        try {
            let reports = null;
            if (varExists(REPORTS))
                reports = getVar(REPORTS).filter(report=> {
                                return report.listingId === listing.docId;
                            });

            if (reports !== null) {
                // The were user reports on this listing.
                for (const index in reports) {
                    const report = reports[index];
                    const repDocRef = doc(db, `/listings/${listing.docId}/reports/${report.reportId}`);
    
                    let outcome = {
                        reviewed: true,
                        reviewDate: Timestamp.fromDate(new Date()),
                        moderatorId: currentUser.authCurrentUser.uid,
                        result: (flagListing? 'flagged' : 'not flagged')
                    };
    
                    report.reviewed = true;
                    await updateDoc(repDocRef, outcome);
                } // for (const index in reports) {
                
                if (reports.length > 0) {
                    toast.success('Review completed!', toastifyTheme);
                } // if (reports.length > 0) {
                reports = getVar(REPORTS);
                updateVar(REPORTS, reports.filter(report=> (report.listingId !== listing.docId)));                
            } // if (reports !== null) {
        } catch (error) {
            console.log(error);
        }
        
        setFlagged(flagListing);
        setSubmitted(true);
    } // async function submitReview() {

    async function submitReport() {
        setModalOn(false);
        setSubmitted(false);
        const reportData = {
            listingId: listing.docId,
            reason: reportingReason, 
            reviewed: false
        };

        if (currentUser?.authCurrentUser?.uid !== undefined)
            reportData.userId = currentUser?.authCurrentUser?.uid;

        const docRef = collection(db, `/listings/${listing.docId}/reports/`);
        try {
            await addDoc(docRef, reportData);
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
                    {listing.userId !== currentUser?.authCurrentUser?.uid &&
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
                                    <button className='w3-button w3-btn w3-margin-small w3-theme-d5 w3-round' type='button'
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