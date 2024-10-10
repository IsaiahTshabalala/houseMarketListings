/**File: ./src/components/Explore.js
 * Description: The page in which the user can explore available listings, without searching for anything specific.
 * ----------------------------------------------------------------------------------------------------------------
 * Date         Dev    Version  Description
 * 2024/04/24   ITA    1.00     Genesis.
 * 2024/06/17   ITA    1.01     Leave the Search and Offers links only at the footer of the page.
 * 2024/07/15   ITA    1.02     In the "Search Property Listings" NavLink, update the url to /search/all, and the caption to "Search all Property Listings."
 * 2024/09//17  ITA    1.03     Import shared vars context directly. Variable names moved to the VarNames object.
 *                              This component has effectively become the home page. It now shows all listings, with the options to filter.
 *                              A far better alternative to displaying listing counts of various provinces, which took long to fetch.
 */
import SearchListings from "./SearchListings";
import Listings from "./Listings";
import { useSharedVarsContext } from "../hooks/SharedVarsProvider";
import { VarNames, QueryNames } from '../utilityFunctions/firestoreComms';
import {useEffect, useState} from 'react';

function Explore() {
    const {varExists, addVar, getVar, updateVar} = useSharedVarsContext();
    const [listingsKey, setListingsKey] = useState();
    const [title, setTitle] = useState('Explore Property Listings');
    const firstRender = 'FIRST_RENDER_OF_EXPLORER_COMPONENT';
    
    function handleClick() {
        const key = QueryNames.ALL_LISTINGS;
        if (!varExists(VarNames.LISTINGS_KEY) || getVar(VarNames.LISTINGS_KEY) !== key) {
            console.log('handleClick');
            if (varExists(VarNames.QUERY_NAME))            
                updateVar(VarNames.QUERY_NAME, key);
            else
                addVar(VarNames.QUERY_NAME, key);
    
            if (varExists(VarNames.LISTINGS_KEY))
                updateVar(VarNames.LISTINGS_KEY, key);
            else
                addVar(VarNames.LISTINGS_KEY, key);

            setTitle('Explore Property Listings');

            if (varExists(VarNames.LISTINGS))
                updateVar(VarNames.LISTINGS, []);
            else
                addVar(VarNames.LISTINGS, []);

            updateVar(VarNames.LISTINGS_KEY, key);
            setListingsKey(key);
        }
    } // function handleClick()

    function notify() {
        if (varExists(VarNames.LISTINGS_KEY)) {
            const key = getVar(VarNames.LISTINGS_KEY);
            if (listingsKey !== key) {
                if (!varExists(VarNames.QUERY_NAME))
                    addVar(VarNames.QUERY_NAME, QueryNames.FILTERED_LISTINGS);
                else
                    updateVar(VarNames.QUERY_NAME, QueryNames.FILTERED_LISTINGS);

                if (varExists(VarNames.LISTINGS))
                    updateVar(VarNames.LISTINGS, []);
                else
                    addVar(VarNames.LISTINGS, []);

                setListingsKey(key);
                setTitle('Filter results');
            } // if (listingsKey !== key) {
        }
    }

    function reloadListings() {
        if (varExists(VarNames.LISTINGS_KEY))
            setListingsKey(getVar(VarNames.LISTINGS_KEY));
    }

    useEffect(()=> {
        // Check that this component is rendering for the first time in the current url path.
        if (!varExists(firstRender)) {
            addVar(firstRender, true);
            handleClick(); // This will ultimately result in the fetching of all listings (no search criteria).
        }
        else {
            reloadListings();
        }
    }, []);

    return (
        <div className='w3-padding'>       
            <h1>{title}</h1>
            <div>
                <SearchListings className='side-by-side' notify={notify} />
                <button className='w3-btn w3-margin w3-theme-d5 w3-round side-by-side'
                    type='button' onClick={e=> handleClick()}>All Listings
                </button>
            </div>
            {listingsKey &&
                <Listings key={listingsKey} />
            }
        </div>
    );
}

export default Explore;
