from flask import Flask, request, jsonify
import re
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend

mock_database = {
    '123456789012': {
        'name': 'Rajesh Kumar',
        'dob': '1990-01-01',
        'state': 'Delhi'
    },
    '987654321098': {
        'name': 'Anita Sharma',
        'dob': '1985-07-10',
        'state': 'Maharashtra'
    },
    '112233445566': {
        'name': 'Mohit Verma',
        'dob': '1992-03-15',
        'state': 'Uttar Pradesh'
    },
    '556677889900': {
        'name': 'Priya Reddy',
        'dob': '1998-12-05',
        'state': 'Telangana'
    },
    '223344556677': {
        'name': 'Aarav Mehta',
        'dob': '1995-06-20',
        'state': 'Gujarat'
    }
}

def is_valid_aadhaar(aadhaar_number):
    pattern = r'^\d{12}$'
    return bool(re.match(pattern, aadhaar_number))

@app.route('/verify', methods=['POST'])
def verify_aadhaar():
    data = request.get_json()
    aadhaar_number = data.get('aadhaar')

    if not is_valid_aadhaar(aadhaar_number):
        return jsonify({'status': 'error', 'message': 'Invalid Aadhaar format'}), 400

    if aadhaar_number in mock_database:
        user = mock_database[aadhaar_number]
        return jsonify({'status': 'success', 'message': 'Aadhaar Verified', 'data': user})
    else:
        return jsonify({'status': 'fail', 'message': 'Aadhaar not found'}), 404

if __name__ == '__main__':
    app.run(debug=True)
