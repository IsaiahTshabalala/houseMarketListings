import {BsPersonFill, BsCompassFill, BsTagsFill} from 'react-icons/bs';
import { NavLink, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { isSignedIn } from '../config/appConfig';

function MenuBar() {
    const location = useLocation();
    const [selected, setSelected] = useState(location.pathname);
    
    const clickedItemStyle = { 
        // Change to this style when selected.
        color: '#fff',
        backgroundColor:'#6D8764'
    };

    // w3ThemeD5 created because the sub-menu items, when given the class 'w3-theme-d5', did not dynamically adapt to 'clickedItemStyle' styling
    // when selected, so the work around was to assign the w3-theme-d5 styling inline using w3ThemeD5.
    const w3ThemeD5 = {
        color: '#fff',
        backgroundColor: '#364332'
    };

    function selectItem(path) {
        setSelected(path);
    } // function selectItem(target)

    function isSelected(path) {
        if (path === '/')
            return selected === path;

        return selected.startsWith(path);
    } // function isSelected(target)
    
    useEffect(() => {
        selectItem(location.pathname);
    }, [location.pathname]);    

    return (
        // The selectItem function ought to receive the exact description of the item to set, not e.target.name. 
        // Otherwise it won't work consistently.
        <div className='w3-bar w3-theme-d5 w3-padding ' >
            <NavLink id='explore' className='w3-bar-item w3-button w3-mobile w3-round'
                style={(isSelected('/') || isSelected('/listings')) ? clickedItemStyle : null} onClick={e=> selectItem('/')} to='/'>
                <div ><BsCompassFill/></div>
                <div className='w3-tiny'>Explore</div>
            </NavLink>
            
            <NavLink id='offers' className='w3-bar-item w3-button w3-mobile w3-round'
                style={isSelected('/offers')? clickedItemStyle : null} onClick={e=> selectItem('/offers')} to='/offers'>
                <div><BsTagsFill/></div>
                <div className='w3-tiny'>Offers</div>
            </NavLink>

            <div className='w3-dropdown-hover w3-mobile w3-theme-d5'>
                <button className='w3-button w3-round' style={isSelected('/my-profile/')? clickedItemStyle : null}>
                    <div><BsPersonFill/></div>
                    <div className='w3-tiny' >Profile</div>
                </button>
                
                <div    className='w3-dropdown-content w3-bar-block w3-win8-green'>
                    {isSignedIn() &&
                    <NavLink id='myListings' className='w3-bar-item w3-button w3-mobile w3-border'
                        style={isSelected('/my-profile/listings')? clickedItemStyle : w3ThemeD5} onClick={e=> selectItem('/my-profile/listings')} to='/my-profile/listings'>
                        My Listings
                    </NavLink>}
                    
                    {isSignedIn() &&
                    <NavLink id='myAccount' className='w3-bar-item w3-button w3-mobile w3-border'
                        style={isSelected('/my-profile/account')? clickedItemStyle : w3ThemeD5} onClick={e=> selectItem('/my-profile/account')} to='/my-profile/account'>
                        My Account
                    </NavLink>}
                    
                    {isSignedIn() &&
                    <NavLink className='w3-bar-item w3-button w3-mobile w3-border w3-theme-d5' to='/signout'>
                        Sign Out
                    </NavLink>}

                    {!isSignedIn() &&
                    <NavLink className='w3-bar-item w3-button w3-mobile w3-border w3-theme-d5' to='/signin'>
                        Sign in
                    </NavLink>}
                </div>
                
            </div>
            
        </div>
 
    );
} // function MenuBar()

export default MenuBar;
