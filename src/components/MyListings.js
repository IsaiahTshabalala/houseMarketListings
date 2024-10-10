/**
 * File: ../src/components/MyListings.js
 * Purpose: Display the listings created by the currently signed in user. Also offer the user a chance to add
 *          a new listing.
 * 
 * Date        Dev    Version  Description
 * 2024/07/09  ITA    1.02     Rectify the CSS of the ADD NEW LISTING NavLink.
 *                             Remove the listingsKey, it is not used.
 * 2024/07/11  ITA    1.03     Ensure the guaranteed display of user listings. Even if the user has only 1 listing.
 * 2024/08/11  ITA    1.04     Import context directly. Variable names moved to the VarNames object.
 *                             Query name to be specified, so as to provide a que to the listings component, as to which query to invoke.
 */
import { Link } from "react-router-dom";
import { IoIosArrowForward } from "react-icons/io";
import Listings from './Listings';
import Registered from './Registered';
import { VarNames, QueryNames } from '../utilityFunctions/firestoreComms';
import { useSharedVarsContext } from '../hooks/SharedVarsProvider';
import { useEffect, useState } from "react";

function MyListings() {
    const {addVar, updateVar, varExists} = useSharedVarsContext();
    const [queryName, setQueryName] = useState('');

    useEffect(() => {
        if (!varExists(VarNames.QUERY_NAME))
            addVar(VarNames.QUERY_NAME, QueryNames.MY_LISTINGS);
        else
            updateVar(VarNames.QUERY_NAME, QueryNames.MY_LISTINGS);

        setQueryName(QueryNames.MY_LISTINGS);
    }, []);
    
    return (
        <Registered>
            <div className='w3-container'>
                <h1>My Listings</h1>
                <div>
                    <Link className="w3-btn w3-round w3-theme-d5" to='/my-profile/listings/new'>
                        Add new listing <IoIosArrowForward/>
                    </Link>
                    {queryName &&
                        <Listings/>
                    }
                </div>
            </div>            
        </Registered>
    );
}

export default MyListings;
