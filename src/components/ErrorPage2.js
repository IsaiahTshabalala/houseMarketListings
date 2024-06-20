/**
 * File: ErrorPage2.js
 * Descrpition: Error Page.
 * Date         Dev  Version  Description
 * 2023/07/28   ITA  1.00     Genesis * 2024/05/09   ITA  1.01     Replace Home with Home icon in the Home link.
 */
import PropTypes from 'prop-types';
import { BiError } from 'react-icons/bi';
import { FaHome } from 'react-icons/fa';
import { NavLink } from 'react-router-dom';

function ErrorPage2({message}) {
    return (
        <>
            <div className='w3-panel w3-win8-crimson w3-padding'>
                <h3><BiError/>Error!</h3>
                <p>{message}</p>
                
                <p>
                    <NavLink className='w3-margin w3-padding w3-large' to='/'><FaHome/></NavLink>
                </p>
            </div>
        </>
    );
}

ErrorPage2.propTypes = {
    message: PropTypes.string.isRequired
}

export default ErrorPage2;