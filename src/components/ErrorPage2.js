import PropTypes from 'prop-types';
import { BiError } from 'react-icons/bi';
import { NavLink } from 'react-router-dom';

function ErrorPage2({message}) {
    return (
        <>
            <div className='w3-panel w3-win8-crimson w3-padding'>
                <h3><BiError/>Error!</h3>
                <p>{message}</p>
                
                <p>
                    <NavLink to='/'>Home</NavLink>
                </p>
            </div>
        </>
    );
}

ErrorPage2.propTypes = {
    message: PropTypes.string.isRequired
}

export default ErrorPage2;