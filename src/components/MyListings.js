/**
 * File: ../src/components/MyListings.js
 * Purpose: Display the listings created by the currently signed in user. Also offer the user a chance to add
 *          a new listing.
 */
import { useContext, useEffect, useRef, useState } from 'react';
import { NavLink } from "react-router-dom";
import { toast, ToastContainer } from 'react-toastify';
import { IoIosArrowForward } from "react-icons/io";
import { sharedVarsContext } from "../hooks/SharedVarsProvider";
import Listings from './Listings';
import Protected from './Protected';
import { getListingsByUserIdQueryObject, GET_LISTINGS_QUERY_OBJECT } from '../utilityFunctions/firestoreComms';
import { userContext } from '../hooks/UserProvider';
import toastifyTheme from './toastifyTheme';

function MyListings() {
    const {varExists, addVar} = useContext(sharedVarsContext);
    const firstRenderRef = useRef(true);
    const [listingsKey, setListingsKey] = useState(Math.random());
    const keyStep = 0.0000000000001;

    useEffect(()=> {
        (async ()=> {
            if (firstRenderRef.current === false)
                return;

            firstRenderRef.current = false;

            try {
                if (!varExists(GET_LISTINGS_QUERY_OBJECT)) {
                    addVar(GET_LISTINGS_QUERY_OBJECT, getListingsByUserIdQueryObject);
                    setListingsKey(listingsKey + keyStep);
                } // if (!varExists(LISTINGS)) {
            } catch (error) {
                console.log(error);
                toast.error(error, toastifyTheme);
            } finally {
            } // finally

        })();

    }, []);
    
    return (
        <Protected>
            <div className='w3-container'>
                <h1>My Listings</h1>
                <div>
                    <NavLink to='/my-profile/listings/new'>
                        Add new listing <IoIosArrowForward/>
                    </NavLink>

                    {varExists(GET_LISTINGS_QUERY_OBJECT) &&
                        <Listings/>
                    }

                    <ToastContainer/>
                </div>
            </div>            
        </Protected>
    );
}

export default MyListings;
