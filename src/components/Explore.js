/**File: ./src/components/Explore.js
 * Description: The page in which the user can explore available listings, without searching for anything specific.
 * ----------------------------------------------------------------------------------------------------------------
 * Date         Dev    Version  Description
 * 2024/04/24   ITA    1.00     Genesis.
 * 2024/06/17   ITA    1.01     Leave the Search and Offers links only at the footer of the page.
 * 2024/07/15   ITA    1.02     Update url of Search for all property listings to /search/all.
 */
import ExploreProvinces from "./ExploreProvinces";
import { NavLink } from "react-router-dom";

function Explore() {
    return (
        <div className='w3-padding'>       
            <h1>Explore Property Listings</h1>
            <ExploreProvinces/>    

            <footer>
                <NavLink className="w3-btn w3-margin w3-round w3-theme-d5" to='/search/all'>Search for all Property Listings</NavLink><br/>
                <NavLink className="w3-btn w3-margin w3-round w3-theme-d5" to='/search/offers'>Search for Offers</NavLink>               
            </footer>
        </div>
    );
}

export default Explore;
