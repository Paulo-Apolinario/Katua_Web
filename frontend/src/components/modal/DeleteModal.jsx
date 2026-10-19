const DeleteModal = ({ handleDelete, title = "Delete Confirmation", message = "Do you want to delete this record?", confirmLabel = "Delete", cancelLabel = "No" }) => {
    return (
        <>
            <div className="modal fade" id="deleteModal" tabIndex="-1" aria-labelledby="deleteModalLabel" aria-hidden="true">
                <div className="modal-dialog modal-dialog-centered border-none">
                    <div className="modal-content">
                        <div className="modal-header border-0">
                            <h1 className="modal-title fs-5" id="deleteModalLabel">{title}</h1>
                            <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div className="modal-body border-none">
                            <p>{message}</p>
                        </div>
                        <div className="modal-footer border-0">
                            <button type="button" className="btn btn-light" data-bs-dismiss="modal">{cancelLabel}</button>
                            <button type="button" className="btn btn-danger"  data-bs-dismiss="modal" onClick={handleDelete} >{confirmLabel}</button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    )
}

export default DeleteModal;