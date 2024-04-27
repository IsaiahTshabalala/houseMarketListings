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
