
/**
 * File: '../src/components/Listing.js'
 * Purpose: Display the page of a listing that the user clicked in the Listings page.
 * Start Date   End Date    Dev   Version  Description
 * 2023/12/12               ITA   l.00     Genesis.
 * 2024/06/18               ITA   1.01     Improve the appearance of the links such that they appear like buttons, using w3.css classes.
 *                                         Provide functionality for users to edit their listing. 
 *                                         Provide functionality for users to report and flag (moderators only) a listing.
 * 2024/07/01               ITA   1.02     Rename field docId to listingId. 
 *                                         UserId to be used in sorting the sellers in the sellers collection. Remove sortField.
 * 2024/08/07               ITA   1.03     Display the listing's map coordinates.
 * 2024/08/19               ITA   1.06     Remove seller information from view of other users. Alternative method to contact seller to be used in the future.
 * 2024/10/03               ITA   1.07     Import context directly. Variable names moved to VarNames object. User state moved to Global State.
 *                                         Link suffices for non-menu-item links.
 * 2024/10/29               ITA   1.08     Provide the option to report/flag a listing only to users who do not own it.
 * 2026/01/02   2026/01/02  ITA   1.09     toZarCurrencyFormat() and timeStampYyyyMmDd() now imported from 'some-common-functions-js' package.
 */
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { FaBed, FaBath, FaRulerCombined, FaLandmark, FaCar, FaHome, FaUsers, FaTimesCircle } from 'react-icons/fa';
import { LiaFileInvoiceDollarSolid } from "react-icons/lia";
import { FaTachometerAlt } from "react-icons/fa";
import { GiHomeGarage } from 'react-icons/gi';
import { toZarCurrencyFormat, timeStampYyyyMmDd } from 'some-common-functions-js';
import { VarNames } from '../utilityFunctions/firestoreComms';
import { useSharedVarsContext } from '../hooks/SharedVarsProvider';
import { useGlobalStateContext } from '../hooks/GlobalStateProvider';
import { toast, ToastContainer } from 'react-toastify';
import toastifyTheme from './toastifyTheme';
import ReportOrFlag from './ReportOrFlag';
import { BsPencilFill } from 'react-icons/bs';

function Listing() {
    const params = useParams();
    const navigate = useNavigate();
    const {getVar, varExists} = useSharedVarsContext();
    const { getSlice } = useGlobalStateContext();
    const currentUser = getSlice('authCurrentUser');
    
    const [modalOn, setModalOn] = useState(false);
    const [listing, setListing] = useState(null);
    const [slideIndex, setSlideIndex] = useState(0);
    const location = useLocation(); // The location which is the current Url.
    const [listingsLocation, setListingsLocation] = useState(null); // The url to return back to, from this listing page.

    useEffect(() => {
        
        try {
            // Get the listing that was clicked in the listings page.
            if (varExists(VarNames.CLICKED_LISTING))
                setListing(getVar(VarNames.CLICKED_LISTING));
            
            let path = location.pathname;
            // Remove the /:listingId part from the current url.
            path = path.substring(0, path.length - params.listingId.length - 1);
            if (path === '')
                path = '/';
            setListingsLocation(path);

        } catch (error) {
            toast.error(error, toastifyTheme);
        } // catch(error)
    }, []); // useEffect(() => {
    
    function goNext(next) { // Go to the next slide by 1 step.
        let index;
        if (next < 0)
            index = -1;
        else if (next > 0)
            index = 1;
        
        index += slideIndex;
        if (index < 0)
            index = listing.images.length - 1;
        else if (index > listing.images.length - 1)
            index = 0;

        setSlideIndex(index);
    } // function goNext(next) {

    function goToEdit() {
        navigate(`${location.pathname}/edit`);
    } // function goToEdit() {


    function getRateDescription(rateObj) {
        if (!(('amount' in rateObj) && ('frequency' in rateObj)))
            return null;

        let amount = toZarCurrencyFormat(rateObj.amount);
        let frequency = rateObj.frequency;
        if (frequency === 1)
            frequency = ' / month';
        else if (frequency === 12)
            frequency = ' / year';
        else if (frequency > 1)
            frequency = ` / ${frequency} months`;
        else
            frequency = '';

        return `${amount}${frequency}`;        
    } // function getRateDescription(rateObj) {

    return (
        <div className='w3-container'>
            <h1>Listing</h1>
            <p>
                <Link className="w3-btn w3-theme-d5 w3-round" to={listingsLocation}>Back to listings</Link>
            </p>
            <hr/>
            {listing === null?
                <p>
                    Could not display the listing at this time.
                </p>
                :
                <>  
                    <h5>
                        {`${listing.propertyType} for ${listing.transactionType}`}
                    </h5>

                    <h5>
                        Listing ID: {listing.listingId}
                    </h5>
                    
                    <h5>
                        Where:<br/>
                        {
                            ('complexName' in listing.address) &&
                                <span>{listing.address.complexName}, </span>
                        }
                        {('unitNo' in listing.address) &&
                            <span>{listing.address.unitNo}, </span>
                        }
                        <span>{listing.address.streetNo} </span>
                        {('streetName' in listing.address) &&
                            <span>{listing.address.streetName}, </span>
                        }
                        <span> {listing.address.subPlaceName}, </span>
                        <span> {listing.address.mainPlaceName}, </span>
                        <span> {listing.address.municipalityName}, </span>
                        <span> {listing.address.provinceName}</span>
                        <br/>
                        {'mapCoordinates' in listing &&
                            <span>Map Coordinates: {`{ ${listing.mapCoordinates.latitude}, ${listing.mapCoordinates.longitude} }`}</span>
                        }
                    </h5>
                    
                    <p/>
                    
                    {(currentUser?.uid !== listing.userId) &&
                        <ReportOrFlag/>
                    }
                    
                    {(location.pathname === `/my-profile/listings/${params.listingId}`) &&
                        <h4>
                            <Link className='w3-btn w3-round w3-theme-d5' onClick={goToEdit}><BsPencilFill/>Edit this listing</Link>
                        </h4>
                    }

                    <div className='w3-container w3-center w3-padding-small w3-content w3-display-container w3-margin-top'
                        style={{width: '90%'}}>
                        {listing.images.map((image, index)=> {
                                return (
                                    <img
                                        key={index}
                                        src={image.url} 
                                        alt={`image${index + 1}`}
                                        style={{
                                            width: '100%',
                                            display: (slideIndex === index? 'block':'none')
                                        }}
                                    />
                                );
                            }) // formData.images.map((image, index)=> {
                        }  
                        <div className='w3-center w3-display-bottommiddle w3-margin-bottom' style={{width: '50%'}}>
                            <button className='w3-button w3-black w3-display-left' type='button' onClick={e=> goNext(-1)}>&#10094;</button>
                            <button className='w3-button w3-black w3-display-right' type='button' onClick={e=> goNext(1)}>&#10095;</button>
                        </div>
                    </div>

                    <div>
                        {(('offer' in listing.priceInfo) && (timeStampYyyyMmDd(listing.priceInfo.offer.expiryDate) >= timeStampYyyyMmDd(new Date())))?
                            <div className='w3-border w3-round w3-theme-dark w3-padding w3-margin-top'>
                                <h3>
                                    Discount Offer: {
                                        toZarCurrencyFormat(listing.priceInfo.offer.discountedPrice) + (listing.transactionType === 'Rent'? ' / month': '')
                                    }
                                </h3>
                                <h3>
                                    {listing.transactionType === 'Rent'? 
                                        `Pay this amount for the first ${listing.priceInfo.offer.appliesFor} months, and pay the regular price thereafter. `: ''
                                    }
                                    <span>Offer expires on {new Date(listing.priceInfo.offer.expiryDate).toDateString()}</span>
                                </h3>
                                <h4 className='w3-theme w3-padding'>Regular Price: {toZarCurrencyFormat(listing.priceInfo.regularPrice) + (listing.transactionType === 'Rent'? ' / month': '')}</h4>
                            </div>
                            :
                            <h3 className='w3-theme-l2 w3-padding w3-margin-top'>{toZarCurrencyFormat(listing.priceInfo.regularPrice) + (listing.transactionType === 'Rent'? ' / month': '')}</h3>
                        }
                    </div>
                    
                    <div className='w3-margin-top'>
                        <h4>Features</h4>
                        <div className='w3-margin-right side-by-side'><FaBed/> {listing.numBedrooms}</div>
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

                    {('rates' in listing) &&
                        <div className='w3-margin-top'>
                            <h4>Expected Rate Payments</h4>
                            {('utilityRates' in listing.rates) &&
                                <div className='w3-margin-right'>
                                    <FaTachometerAlt/> {getRateDescription(listing.rates.utilityRates)}
                                </div>
                            }
                            
                            {('propertyTax' in listing.rates) &&
                                <div className='w3-margin-right'>
                                    <FaHome/> <LiaFileInvoiceDollarSolid/> {getRateDescription(listing.rates.propertyTax)}
                                </div>
                            }
                            
                            {('associationFees' in listing.rates) &&
                                <div className='w3-margin-right'>
                                    <FaUsers/> {getRateDescription(listing.rates.associationFees)}
                                </div>
                            }
                        </div>
                    }

                    <h3>{listing.title}</h3>

                    <p>
                        {listing.description}
                    </p>

                    <h4>
                        Posted on {listing.dateCreated.toString()}.
                    </h4>

                    {(currentUser) && (currentUser.uid === listing.userId)?
                        <>
                            <h4>
                                <u>You created this listing.</u>
                            </h4>
                            {(location.pathname === `/my-profile/listings/${listing.listingId}`) &&
                                <h4>
                                    <Link className='w3-btn w3-round w3-theme-d5' onClick={goToEdit}><BsPencilFill/>Edit this listing</Link>
                                </h4>
                            }
                        </>
                        :
                        <>                            
                            <p>
                                <Link className="w3-btn w3-round w3-theme-d5" onClick={e=> setModalOn(true)}>
                                    Contact Seller
                                </Link>
                            </p>
                        </>
                    }

                    <div id='id01' className='w3-modal' style={{display: modalOn? 'block': 'none'}}>
                        <div className='w3-modal-content'>
                            <div className='w3-container w3-theme'>
                                <span onClick={e=>  setModalOn(false)} className='w3-button w3-display-topright'><FaTimesCircle/></span>
                                <h4>
                                    Feature currently unavailable
                                </h4>
                                
                                
                                
                                <div className='w3-padding'>
                                    <button className='w3-btn w3-margin-small w3-theme-d5 w3-round' type='button'
                                            onClick={e=> setModalOn(false)}>OK</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            }

            <hr/>
            <p>
                <Link className="w3-btn w3-round w3-theme-d5" to={listingsLocation}>Back to listings</Link>
            </p>
            <ToastContainer/>

        </div>
    )
}

export default Listing;