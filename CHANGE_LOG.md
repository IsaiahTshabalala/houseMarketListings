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