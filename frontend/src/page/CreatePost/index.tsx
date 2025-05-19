import React from "react";
import { Form, Input, Button, message, Upload } from "antd";
import ReactDOM from "react-dom";
import type { NotesInterface } from "../../interface/INote";
import { createNote } from "../../service/post";
import { useNavigate } from "react-router-dom";
import "./popup.css";
import ImgCrop from "antd-img-crop";
import { PlusOutlined } from "@ant-design/icons";
import type { GetProp, UploadFile, UploadProps } from "antd";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  CourseID: number;
  UserID: number;
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
  const [fileList, setFileList] = React.useState<UploadFile[]>([]);

  type FileType = Parameters<GetProp<UploadProps, "beforeUpload">>[0];

  const onChange: UploadProps["onChange"] = ({ fileList: newFileList }) => {
    setFileList(newFileList);
  };

  const onPreview = async (file: UploadFile) => {
    let src = file.url as string;
    if (!src) {
      src = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file.originFileObj as FileType);
        reader.onload = () => resolve(reader.result as string);
      });
    }
    const image = new Image();
    image.src = src;
    const imgWindow = window.open(src);
    imgWindow?.document.write(image.outerHTML);
  };

  // ฟังก์ชันแปลงไฟล์รูปเป็น base64
  const getBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });

  const onFinish = async (values: NotesInterface) => {
    setLoading(true);

    try {
      let pictureBase64: string | null = null;

      if (fileList.length > 0) {
        pictureBase64 = await getBase64(fileList[0].originFileObj as File);
      }

      const dataToSend = {
        ...values,
        userId: Number(UserID),
        status: "active",
        picture: pictureBase64, // base64 หรือ null ถ้าไม่เพิ่มรูป
      };

      console.log("Data to send to createNote:", dataToSend);

      const res = await createNote(dataToSend);

      if (res) {
        messageApi.open({
          type: "success",
          content: "บันทึก Note สำเร็จ!",
        });
        onReviewSubmit(CourseID);
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
              label="รูปประจำตัว"
            >
              <ImgCrop rotationSlider>
                <Upload
                  fileList={fileList}
                  onChange={onChange}
                  onPreview={onPreview}
                  beforeUpload={(file) => {
                    setFileList([...fileList, file]);
                    return false; // ป้องกันให้ไม่อัปโหลดอัตโนมัติ
                  }}
                  maxCount={1}
                  multiple={false}
                  listType="picture-card"
                >
                  <div>
                    <PlusOutlined />
                    <div style={{ marginTop: 8 }}>อัพโหลด</div>
                  </div>
                </Upload>
              </ImgCrop>
            </Form.Item>

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
