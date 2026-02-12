/**
 * File: ./src/components/Loader.js
 * Description:
 * A loader component
 * ================================================================================
 * Patch History
 * Start Date  End Date    Dev   Version  Description
 * 2026/01/06  2026/01/06  ITA   1.02     Imported the specific objects from 'prop-types', reducing build time.
 */
import '../loader.css';
import { string as stringPropType, bool as boolPropType } from 'prop-types';

function Loader({message = null, small = false}) {
  // A component to indicate that data is still being loaded.
  return (
    <div className='w3-container w3-margin'>
      <div className={`${small? 'loader-small' : 'loader'}  w3-center`}></div>
      <p>{message === null? 'Busy, please wait ...' : message}</p>
    </div>
  );
}

Loader.propTypes = {
  message: stringPropType,
  small: boolPropType
};

export default Loader;
