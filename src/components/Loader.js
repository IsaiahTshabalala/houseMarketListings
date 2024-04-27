import '../loader.css';
import PropTypes from 'prop-types';

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
  message: PropTypes.string,
  small: PropTypes.bool
};

export default Loader;
