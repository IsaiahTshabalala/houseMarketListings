/**
 * File: '../src/components/Listing.js'
 * Purpose: Display the page of a listing that the user clicked in the Listings page.
 * Date         Dev        Description
 * 2023/12/12   ITA        Genesis.
 */
import { useParams, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useContext, useState } from 'react';
import { FaBed, FaBath, FaRulerCombined, FaLandmark, FaCar, FaHome, FaUsers } from 'react-icons/fa';
import { LiaFileInvoiceDollarSolid } from "react-icons/lia";
import { FaTachometerAlt } from "react-icons/fa";
import { GiHomeGarage } from 'react-icons/gi';
import { toZarCurrencyFormat } from '../utilityFunctions/commonFunctions';
import { getUser } from '../utilityFunctions/firestoreComms';
import { sharedVarsContext } from '../hooks/SharedVarsProvider';
import { collectionsContext } from '../hooks/CollectionsProvider';
import { userContext } from '../hooks/UserProvider';
import { toast, ToastContainer } from 'react-toastify';
import toastifyTheme from './toastifyTheme';
import Loader from './Loader';
import { BsPencilFill } from 'react-icons/bs';

function Listing() {
    const parms = useParams();
    const navigate = useNavigate();
    const {getVar, varExists} = useContext(sharedVarsContext);
    const { currentUser } = useContext(userContext);
    const { getCollectionData, collectionExists, addCollection, updateCollection} = useContext(collectionsContext);
    
    /* Facilitate sharing of sellers data between the listings that are being clicked.
       So that listings with a common seller do not cause multiple trips to the Firestore database,
       when the user requests seller information (Contact Seller) */

    const [listing, setListing] = useState(null);
    const [slideIndex, setSlideIndex] = useState(0);
    const [sellerLoaded, setSellerLoaded] = useState(true);
    const location = useLocation(); // Returns the location object (which is the Url in the web-browser);
    const [listingsLocation, setListingsLocation] = useState(null);

    useEffect(() => {
        try {
            if (!collectionExists('sellers'))
                addCollection('sellers', []); 
            // Get the listing that was clicked in the listings page.
            if (varExists('clickedListing'))
                setListing(getVar('clickedListing'));
            
            let path = location.pathname;
            
            // Remove the /:listingId part from the current url.
            path = path.substring(0, path.length - parms.listingId.length - 1);
            setListingsLocation(path);

        } catch (error) {
            toast.error(error, toastifyTheme);
        } // catch(error)
    }, []);    
    
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

    async function loadSellerInfo() {
        try {
            setSellerLoaded(false);
            if (Object.keys(currentUser).length === 0) { // User not signed in, as the currentUser object from userContext is empty.
                toast.error('You must be signed in to be able view seller information!', toastifyTheme);
                return;
            }
            
            if (!('personalDetails' in currentUser)) {
                toast.error('You must complete registration of your account be able to view seller information!', toastifyTheme);
                return;
            } // if (!('personalDetails' in currentUser))

            // Find the seller in the collection.
            const sellers = getCollectionData('sellers');
            let seller = sellers.find(aSeller=> {
                return aSeller.userId === listing.userId;
            });
            // If seller was not found in the collection, then get it from Firestore.
            if (seller === undefined) {
                seller = await getUser(listing.userId);
                if (seller !== null) {
                    seller.userId = listing.userId;
                    seller.sortField = seller.userId;  // Add the sortField, a requirement for the collectionsContext to enable sorting.
                    updateCollection('sellers', [...sellers, seller]);
                    listing.seller = seller;
                }
                else
                    toast.error('Seller not found! This is unusual. We apologise for the inconvenience.', toastifyTheme);
            } // if (seller === undefined) {
            else
                listing.seller = seller;
        } catch (error) {
            toast.error('You must registered and signed in to be able to view seller information!', toastifyTheme);
        } finally {
            setSellerLoaded(true);
        }
    } // function loadSellerInfo() {

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
                <NavLink to={listingsLocation}>Back to listings</NavLink>
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
                    </h5>
                    
                    {(location.pathname === `/my-profile/listings/${listing.docId}`) &&
                        <h4>
                            <NavLink onClick={goToEdit}><BsPencilFill/>Edit this listing</NavLink>
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
                        {(('offer' in listing.priceInfo) && (new Date(listing.priceInfo.offer.expiryDate).getTime()) >= Date.now())?
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
                        Posted on {listing.dateCreated.toDateString()}.
                    </h4>

                    {(('uid' in currentUser)
                        && (currentUser.uid === listing.userId))?
                        <>
                            <h4>
                                <u>You created this listing.</u>
                            </h4>
                            {(location.pathname === `/my-profile/listings/${listing.docId}`) &&
                                <h4>
                                    <NavLink onClick={goToEdit}><BsPencilFill/>Edit this listing</NavLink>
                                </h4>
                            }
                        </>
                        :
                        <>
                            {sellerLoaded?
                                <>
                                    {(('seller' in listing) && (listing.seller !== null))?
                                        <p className='w3-input-theme-1 w3-padding-small'>
                                            Contact: {listing.seller.firstName + ' ' + listing.seller.surname}<br/>
                                            Email: {listing.seller.email}<br/>
                                            Mobile No: {listing.seller.mobileNo}
                                        </p>
                                        :
                                        <h4>
                                            <NavLink onClick={e=> loadSellerInfo()}>
                                                Contact Seller
                                            </NavLink>
                                        </h4>
                                    }
                                </>
                                :
                                <Loader message='Loading seller...'/>
                            }
                        </>
                    }
                </>
            }

            <hr/>
            <p>
                <NavLink to={listingsLocation}>Back to listings</NavLink>
            </p>
            <ToastContainer/>
        </div>
    )
}

export default Listing;