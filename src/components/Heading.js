/**
 * File: ./src/components/Heading.js
 * Description:
 * Heading component.
 * 
 * Date         Dev  Version  Description
 * 2024/04/11   ITA  1.00     Genesis.
 * 2024/06/20   ITA  1.00     Restore this file. Deleted by mistake.
 */
import Proptypes from 'prop-types';

function Heading({title}) {
    return (
            <div className='w3-container'>
                <h1>{title}</h1>
            </div>
    );
}

Heading.propTypes = {
    title: Proptypes.string.isRequired
};

export default Heading;
