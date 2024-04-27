/**File: ./src/components/Explore.js
 * Description: The page in which the user can explore available listings, without searching for anything specific.
 * ----------------------------------------------------------------------------------------------------------------
 * Date          Dev    Description
 * 2024/04/24    ITA    Genesis.
 */
import ExploreProvinces from "./ExploreProvinces";
import { NavLink } from "react-router-dom";

function Explore() {
    return (
        <div className='w3-padding'>       
            <h1>Explore Property Listings</h1>

            <div>
                <NavLink to='/search'>Search for Property Listings</NavLink><br/>
                <NavLink to='/search/offers'>Search for Offers</NavLink>
            </div>
            <ExploreProvinces/>
            
            <footer>
                <NavLink to='/search'>Search for Property Listings</NavLink><br/>
                <NavLink to='/search/offers'>Search for Offers</NavLink>
            </footer>
        </div>
    );
}

export default Explore;
