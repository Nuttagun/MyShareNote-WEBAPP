import React from "react";
import { Form, Input, Button, message } from "antd";
import ReactDOM from "react-dom";
import type { NotesInterface } from "../../interface/INote";
import { createNote } from "../../service/post";
import { useNavigate } from "react-router-dom";
import "./popup.css";

interface ModalProps {
    open: boolean;
    onClose: () => void;
    CourseID: number;
    UserID: string;
    onReviewSubmit: (courseId: number) => void;
}

const ModalCreate: React.FC<ModalProps> = ({
    open,
    onClose,
    CourseID,
    UserID,
    onReviewSubmit,
}) => {
    if (!open) return null;

    const navigate = useNavigate();
    const [form] = Form.useForm();
    const [messageApi, contextHolder] = message.useMessage();
    const [loading, setLoading] = React.useState(false);


    const onFinish = async (values: NotesInterface) => {

        console.log("Data to send to createNote:", {
            ...values,
            userId: UserID.toString(),
            status: "active",
        });

        setLoading(true);
        try {
            const res = await createNote({
                ...values,
                userId: UserID.toString(),
                status: "active",
            });

            console.log(res)

            if (res) {
                messageApi.open({
                    type: "success",
                    content: "บันทึก Note สำเร็จ!",
                });
                onReviewSubmit(CourseID); // คุณอาจเปลี่ยนชื่อให้สอดคล้องกว่านี้ เช่น onNoteSubmit
                setTimeout(() => {
                    onClose();
                    navigate("/");
                }, 2000);
            } else {
                messageApi.open({
                    type: "error",
                    content: "ไม่สามารถบันทึก Note ได้",
                });
            }
        } catch (error) {
            messageApi.open({
                type: "error",
                content: "เกิดข้อผิดพลาด",
            });
        } finally {
            setLoading(false);
        }
    };


    return ReactDOM.createPortal(
        <>
            {contextHolder}
            <div className="overlay" />
            <div className="modal">
                <div>
                    <p className="text">Post Note</p>
                    <Form
                        form={form}
                        name="reviewForm"
                        onFinish={onFinish}
                        layout="vertical"
                    >
                        <Form.Item
                            name="title"
                            label="Title"
                            rules={[{ required: true, message: "Please enter the note title!" }]}
                        >
                            <Input />
                        </Form.Item>

                        <Form.Item
                            name="description"
                            label="Description"
                            rules={[{ required: true, message: "Please enter the description!" }]}
                        >
                            <Input.TextArea rows={4} style={{ width: "400px" }} />
                        </Form.Item>

                        <Form.Item className="box-button-reviews">
                            <Button type="default" onClick={onClose}>
                                Cancel
                            </Button>
                            <Button
                                type="primary"
                                htmlType="submit"
                                style={{ marginLeft: "8px" }}
                                loading={loading}
                            >
                                Submit
                            </Button>
                        </Form.Item>
                    </Form>
                </div>
            </div>
        </>,
        document.body
    );
};

export default ModalCreate;