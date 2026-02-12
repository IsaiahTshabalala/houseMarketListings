/**
 * File: ./src/components/Heading.js
 * Description:
 * Heading component.
 * 
 * Start Date  End Date    Dev  Version  Description
 * 2024/04/11              ITA  1.00     Genesis.
 * 2024/06/20              ITA  1.00     Restore this file. Deleted by mistake.
 * 2026/01/06  2026/01/06  ITA  1.03     Imported  specific object, string, from prop-types, reducing build time.
 */
import { string as stringPropType} from 'prop-types';

function Heading({title}) {
    return (
            <div className='w3-container'>
                <h1>{title}</h1>
            </div>
    );
}

Heading.propTypes = {
    title: stringPropType.isRequired
};

export default Heading;
