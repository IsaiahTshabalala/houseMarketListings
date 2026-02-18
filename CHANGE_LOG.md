## 2025/12/27 to 2026/02/12 - ITA - Version 2.0.0
* Moved the dropdowns to an external package 'dropdowns-js' for further refinement, and reusability.
* Removed the useCollectionsContext() hook, as it is no longer needed to work with the dropdowns.
* Moved a number of utility functions to an external package 'some-common-functions-js' for refinement, and reusability.
* Replaced the loDash functions with an alternative from some-common-functions-js.
* In input forms where state data is too large, split into smaller slices, so that during data capture, key strokes do not cause the re-render of a large area of a form, but only the slice where the key stroke is happening.
* Added the EditField component and the useBackupStore hook, to improve the edit functionality in input forms.
* Added the FieldError component, to improve the display of validation errors.
* Made sure that the Listings component displays a loader while the listings are being fetched, instead of displaying 'No listings'.
* Enabled direct querying of the Firestore database for Listings involving a regular price range, or an offer expiry date range and a discounted price range.
  
## 2025/02/12 to 2026/02/13 - ITA - Version 2.0.1
* SearchListings.js: replaced single and multi selection dropdowns with radio buttons and checkboxes respectively, where the dropdown items had equal or less than 10 items.
* SearchListings.js and firestoreComms: property types and number of bedrooms are no longer optional fields for conducting a search. Given that the queries of the searches now include a price range, the required additional composite indexes, each with a minimum of 4 fields, cannot be afforded at this stage.
* SearchListings.js: added some small padding around error fields.

## 2026/02/16 to 2026/02/18 - ITA - Version 2.0.2
* AccountInfo and AddOrEditListing: update form data to be submitted to Firestore only if there were changes that occurred.
* AccountInfo: ensured that during updates optional fields are handled robustly to prevent violation of Firestore rules during submission.
* Placed the <ToastContainer> separately from the other components to ensure consistency in the pop up of toast messages when the toast is called.
SearchListings: replaced the incorrect class attribute with className attribute in the html.