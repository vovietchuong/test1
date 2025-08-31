// auth-system.js (optimized)
class AuthSystem {
    constructor() {
        this.scoresPerPage = 10;
        this.lastVisible = null;
        this.isInitialized = false;
        this.initFirebase();
        this.setupEventListeners();
        this.checkAuthState();
    }

    initFirebase() {
        // Kiểm tra xem Firebase đã được khởi tạo chưa
        if (typeof firebase === 'undefined') {
            console.error('Firebase is not loaded');
            return;
        }

        const firebaseConfig = {
            apiKey: "AIzaSyAPcaScN-HrCcxiUz_J1QrrREF9sxCfvD8",
            authDomain: "mathhubvn.firebaseapp.com",
            projectId: "mathhubvn",
            storageBucket: "mathhubvn.firebasestorage.app",
            messagingSenderId: "1001364433767",
            appId: "1:1001364433767:web:ae1547dc7d1524a6319dc2",
            measurementId: "G-2YNQZ48JVK"
        };

        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        
        this.analytics = firebase.analytics();
        this.auth = firebase.auth();
        this.firestore = firebase.firestore();
        this.storage = firebase.storage();
        this.isInitialized = true;
    }

    setupEventListeners() {
        // DOM Elements với null checking
        this.loginBtn = document.getElementById('login-btn');
        this.logoutBtn = document.getElementById('logout-btn');
        this.userInfo = document.getElementById('user-info');
        this.userName = document.getElementById('user-name');
        this.loginModal = document.getElementById('login-modal');
        this.closeModal = document.getElementById('close-modal');
        this.loginTab = document.getElementById('login-tab');
        this.registerTab = document.getElementById('register-tab');
        this.loginForm = document.getElementById('login-form');
        this.registerForm = document.getElementById('register-form');
        this.toast = document.getElementById('toast');
        this.profileBtn = document.getElementById('profile-btn');
        this.rankingBtn = document.getElementById('ranking-btn');
        this.challengeBtn = document.getElementById('challenge-btn');

        // Event listeners với null checking
        this.addEvent(this.loginBtn, 'click', () => this.openLoginModal());
        this.addEvent(this.closeModal, 'click', () => this.closeLoginModal());
        this.addEvent(this.loginTab, 'click', () => this.switchToLogin());
        this.addEvent(this.registerTab, 'click', () => this.switchToRegister());
        this.addEvent(this.loginForm, 'submit', (e) => this.handleLogin(e));
        this.addEvent(this.registerForm, 'submit', (e) => this.handleRegister(e));
        this.addEvent(this.logoutBtn, 'click', () => this.handleLogout());
        this.addEvent(this.profileBtn, 'click', () => this.openProfileModal());
        this.addEvent(this.rankingBtn, 'click', () => this.openRankingModal());
        this.addEvent(this.challengeBtn, 'click', () => this.openChallengeModal());
        
        const forgotPassword = document.getElementById('forgot-password');
        this.addEvent(forgotPassword, 'click', (e) => this.handleForgotPassword(e));
    }

    // Helper method để thêm event listener an toàn
    addEvent(element, event, handler) {
        if (element) {
            element.addEventListener(event, handler);
        }
    }

    openLoginModal() {
        if (this.loginModal) {
            this.loginModal.style.display = 'flex';
            // Reset form khi mở modal
            if (this.loginForm) this.loginForm.reset();
        }
    }

    closeLoginModal() {
        if (this.loginModal) this.loginModal.style.display = 'none';
    }

    openProfileModal() {
        const profileModal = document.getElementById('profile-modal');
        if (profileModal) profileModal.style.display = 'flex';
        
        if (window.userSystem) {
            window.userSystem.loadProfileData();
        }
    }

    openRankingModal() {
        const rankingModal = document.getElementById('ranking-modal');
        if (rankingModal) rankingModal.style.display = 'flex';
        
        this.loadRankings('all');
        this.setupRankingTabs();
    }

    openChallengeModal() {
        const challengeModal = document.getElementById('challenge-modal');
        if (challengeModal) challengeModal.style.display = 'flex';
    }

    switchToLogin() {
        if (this.loginTab && this.registerTab && this.loginForm && this.registerForm) {
            this.loginTab.classList.add('active');
            this.registerTab.classList.remove('active');
            this.loginForm.classList.add('active');
            this.registerForm.classList.remove('active');
        }
    }

    switchToRegister() {
        if (this.loginTab && this.registerTab && this.loginForm && this.registerForm) {
            this.registerTab.classList.add('active');
            this.loginTab.classList.remove('active');
            this.registerForm.classList.add('active');
            this.loginForm.classList.remove('active');
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        if (!email || !password) {
            this.showToast('Vui lòng nhập đầy đủ email và mật khẩu!', 'error');
            return;
        }
        
        try {
            await this.auth.signInWithEmailAndPassword(email, password);
            this.showToast('Đăng nhập thành công!', 'success');
            this.analytics.logEvent('login', { method: 'email' });
            this.closeLoginModal();
        } catch (error) {
            this.showToast(this.getErrorMessage(error), 'error');
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const confirm = document.getElementById('register-confirm').value;
        
        if (!name || !email || !password || !confirm) {
            this.showToast('Vui lòng điền đầy đủ thông tin!', 'error');
            return;
        }
        
        if (password !== confirm) {
            this.showToast('Mật khẩu xác nhận không khớp!', 'error');
            return;
        }
        
        if (password.length < 6) {
            this.showToast('Mật khẩu phải có ít nhất 6 ký tự!', 'error');
            return;
        }
        
        try {
            const userCredential = await this.auth.createUserWithEmailAndPassword(email, password);
            await userCredential.user.updateProfile({ displayName: name });
            
            this.showToast('Đăng ký thành công!', 'success');
            this.analytics.logEvent('sign_up', { method: 'email' });
            this.switchToLogin();
            
            // Clear registration form
            document.getElementById('register-form').reset();
        } catch (error) {
            this.showToast(this.getErrorMessage(error), 'error');
        }
    }

    async handleLogout() {
        try {
            await this.auth.signOut();
            this.showToast('Đã đăng xuất!', 'success');
            this.analytics.logEvent('logout');
            localStorage.removeItem("currentUser");
        } catch (error) {
            this.showToast(this.getErrorMessage(error), 'error');
        }
    }

    async handleForgotPassword(e) {
        e.preventDefault();
        let email = document.getElementById('login-email').value;
        
        if (!email) {
            email = prompt('Vui lòng nhập email của bạn:');
            if (!email) return;
        }
        
        try {
            await this.auth.sendPasswordResetEmail(email);
            this.showToast('Email đặt lại mật khẩu đã được gửi!', 'success');
        } catch (error) {
            this.showToast(this.getErrorMessage(error), 'error');
        }
    }

    checkAuthState() {
        this.auth.onAuthStateChanged((user) => {
            if (user) {
                this.updateUIForLoggedInUser(user);
                
                // Lưu thông tin user vào localStorage
                const currentUser = {
                    name: user.displayName || user.email,
                    email: user.email,
                    uid: user.uid,
                    photoURL: user.photoURL || ''
                };
                localStorage.setItem("currentUser", JSON.stringify(currentUser));

                // Hiển thị nút thách đấu
                if (this.challengeBtn) this.challengeBtn.style.display = 'block';

                // Load user scores
                this.loadUserScores();
            } else {
                this.updateUIForLoggedOutUser();
                
                // Ẩn nút thách đấu
                if (this.challengeBtn) this.challengeBtn.style.display = 'none';
            }
        });
    }

    updateUIForLoggedInUser(user) {
        if (this.loginBtn) this.loginBtn.style.display = 'none';
        if (this.userInfo) this.userInfo.style.display = 'flex';
        if (this.userName) this.userName.textContent = user.displayName || user.email;
        
        const userAvatar = document.getElementById('user-avatar');
        if (userAvatar) {
            if (user.photoURL) {
                userAvatar.innerHTML = `<img src="${user.photoURL}" alt="${user.displayName || 'User'}" loading="lazy">`;
            } else {
                userAvatar.innerHTML = `<i class="fas fa-user"></i>`;
            }
        }
    }

    updateUIForLoggedOutUser() {
        if (this.loginBtn) this.loginBtn.style.display = 'block';
        if (this.userInfo) this.userInfo.style.display = 'none';
    }

    showToast(message, type = 'info') {
        if (!this.toast) return;
        
        this.toast.textContent = message;
        this.toast.className = `toast ${type}`;
        this.toast.style.display = 'block';
        
        setTimeout(() => {
            this.toast.style.display = 'none';
        }, 3000);
    }

    getErrorMessage(error) {
        switch (error.code) {
            case 'auth/invalid-email':
                return 'Email không hợp lệ!';
            case 'auth/user-disabled':
                return 'Tài khoản đã bị vô hiệu hóa!';
            case 'auth/user-not-found':
                return 'Không tìm thấy tài khoản!';
            case 'auth/wrong-password':
                return 'Mật khẩu không đúng!';
            case 'auth/email-already-in-use':
                return 'Email đã được sử dụng!';
            case 'auth/weak-password':
                return 'Mật khẩu quá yếu!';
            case 'auth/operation-not-allowed':
                return 'Hoạt động không được cho phép!';
            default:
                return 'Đã xảy ra lỗi, vui lòng thử lại!';
        }
    }

    setupRankingTabs() {
        const rankingTabs = document.querySelectorAll('.ranking-tab');
        const rankingTabContents = document.querySelectorAll('.ranking-tab-content');
        
        rankingTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabId = tab.getAttribute('data-tab');
                
                // Update active tab
                rankingTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Show corresponding content
                rankingTabContents.forEach(content => {
                    content.style.display = 'none';
                    if (content.id === `${tabId}-tab`) {
                        content.style.display = 'block';
                    }
                });
                
                // Load data based on tab
                if (tabId === 'highscores') {
                    this.loadRankings('all');
                } else if (tabId === 'history') {
                    this.loadHistoryScores();
                } else if (tabId === 'friends') {
                    this.loadFriends();
                }
            });
        });
        
        // Setup ranking filters
        const rankingFilters = document.querySelectorAll('.ranking-filter');
        rankingFilters.forEach(filter => {
            filter.addEventListener('click', () => {
                const gameType = filter.getAttribute('data-filter');
                
                // Update active filter
                rankingFilters.forEach(f => f.classList.remove('active'));
                filter.classList.add('active');
                
                // Load rankings for selected game
                this.loadRankings(gameType);
            });
        });
    }

    async loadRankings(gameType = 'all') {
        const rankingList = document.getElementById('ranking-list');
        if (!rankingList) return;
        
        rankingList.innerHTML = '<li class="ranking-loading">Đang tải dữ liệu xếp hạng...</li>';
        
        try {
            let query = this.firestore.collection('scores')
                .orderBy('score', 'desc')
                .limit(20);
            
            if (gameType !== 'all') {
                query = query.where('gameId', '==', gameType);
            }
            
            const snapshot = await query.get();
            
            if (snapshot.empty) {
                rankingList.innerHTML = '<li class="ranking-loading">Chưa có dữ liệu xếp hạng.</li>';
                return;
            }
            
            rankingList.innerHTML = '';
            let rank = 1;
            
            snapshot.forEach(doc => {
                const data = doc.data();
                const li = document.createElement('li');
                li.className = 'ranking-item';
                
                li.innerHTML = `
                    <span class="rank">${rank}</span>
                    <span class="user-name">${data.userName || 'Người dùng'}</span>
                    <span class="game-name">${this.getGameName(data.gameId)}</span>
                    <span class="score">${data.score}</span>
                `;
                
                rankingList.appendChild(li);
                rank++;
            });
        } catch (error) {
            console.error('Error loading rankings:', error);
            rankingList.innerHTML = '<li class="ranking-loading">Lỗi khi tải dữ liệu xếp hạng.</li>';
        }
    }

    async loadHistoryScores() {
        const historyList = document.getElementById('history-list');
        if (!historyList) return;
        
        historyList.innerHTML = '<li class="ranking-loading">Đang tải lịch sử điểm...</li>';
        
        try {
            const user = this.auth.currentUser;
            if (!user) return;
            
            const query = this.firestore.collection('scores')
                .where('userId', '==', user.uid)
                .orderBy('timestamp', 'desc')
                .limit(this.scoresPerPage);
            
            const snapshot = await query.get();
            
            if (snapshot.empty) {
                historyList.innerHTML = '<li class="ranking-loading">Chưa có lịch sử điểm.</li>';
                return;
            }
            
            historyList.innerHTML = '';
            
            snapshot.forEach(doc => {
                const data = doc.data();
                const li = document.createElement('li');
                li.className = 'ranking-item';
                
                const date = data.timestamp ? data.timestamp.toDate() : new Date();
                const formattedDate = date.toLocaleDateString('vi-VN');
                
                li.innerHTML = `
                    <span class="game-name">${this.getGameName(data.gameId)}</span>
                    <span class="score">${data.score}</span>
                    <span class="date">${formattedDate}</span>
                `;
                
                historyList.appendChild(li);
            });
            
            // Setup pagination
            this.setupHistoryPagination(snapshot);
        } catch (error) {
            console.error('Error loading history scores:', error);
            historyList.innerHTML = '<li class="ranking-loading">Lỗi khi tải lịch sử điểm.</li>';
        }
    }

    setupHistoryPagination(snapshot) {
        const pagination = document.getElementById('history-pagination');
        if (!pagination) return;
        
        pagination.innerHTML = '';
        
        // Get last document for pagination
        this.lastVisible = snapshot.docs[snapshot.docs.length - 1];
        
        // Add "Load More" button
        const loadMoreBtn = document.createElement('button');
        loadMoreBtn.className = 'pagination-btn';
        loadMoreBtn.textContent = 'Tải thêm';
        loadMoreBtn.addEventListener('click', () => this.loadMoreHistoryScores());
        
        pagination.appendChild(loadMoreBtn);
    }

    async loadMoreHistoryScores() {
        const historyList = document.getElementById('history-list');
        if (!historyList || !this.lastVisible) return;
        
        try {
            const user = this.auth.currentUser;
            if (!user) return;
            
            const query = this.firestore.collection('scores')
                .where('userId', '==', user.uid)
                .orderBy('timestamp', 'desc')
                .startAfter(this.lastVisible)
                .limit(this.scoresPerPage);
            
            const snapshot = await query.get();
            
            if (snapshot.empty) {
                this.showToast('Không còn dữ liệu để tải.', 'info');
                return;
            }
            
            snapshot.forEach(doc => {
                const data = doc.data();
                const li = document.createElement('li');
                li.className = 'ranking-item';
                
                const date = data.timestamp ? data.timestamp.toDate() : new Date();
                const formattedDate = date.toLocaleDateString('vi-VN');
                
                li.innerHTML = `
                    <span class="game-name">${this.getGameName(data.gameId)}</span>
                    <span class="score">${data.score}</span>
                    <span class="date">${formattedDate}</span>
                `;
                
                historyList.appendChild(li);
            });
            
            // Update last visible document
            this.lastVisible = snapshot.docs[snapshot.docs.length - 1];
            
            // If no more documents, remove load more button
            if (snapshot.size < this.scoresPerPage) {
                const pagination = document.getElementById('history-pagination');
                if (pagination) pagination.innerHTML = '';
            }
        } catch (error) {
            console.error('Error loading more history scores:', error);
            this.showToast('Lỗi khi tải thêm dữ liệu.', 'error');
        }
    }

    async loadFriends() {
        const friendsList = document.getElementById('friends-list');
        if (!friendsList) return;
        
        friendsList.innerHTML = '<p class="ranking-loading">Đang tải danh sách bạn bè...</p>';
        
        try {
            const user = this.auth.currentUser;
            if (!user) return;
            
            // In a real app, you would query the friends collection
            // For now, we'll just show a placeholder
            setTimeout(() => {
                friendsList.innerHTML = `
                    <div class="friend-item">
                        <div class="friend-avatar">
                            <i class="fas fa-user"></i>
                        </div>
                        <div class="friend-info">
                            <span class="friend-name">Nguyễn Văn A</span>
                            <span class="friend-status">Đang hoạt động</span>
                        </div>
                        <button class="friend-action">Thách đấu</button>
                    </div>
                    <div class="friend-item">
                        <div class="friend-avatar">
                            <i class="fas fa-user"></i>
                        </div>
                        <div class="friend-info">
                            <span class="friend-name">Trần Thị B</span>
                            <span class="friend-status">Ngoại tuyến</span>
                        </div>
                        <button class="friend-action">Thách đấu</button>
                    </div>
                `;
            }, 1000);
        } catch (error) {
            console.error('Error loading friends:', error);
            friendsList.innerHTML = '<p class="ranking-loading">Lỗi khi tải danh sách bạn bè.</p>';
        }
    }

    async loadUserScores() {
        const progressList = document.getElementById('progress-list');
        if (!progressList) return;
        
        try {
            const user = this.auth.currentUser;
            if (!user) return;
            
            const snapshot = await this.firestore.collection('scores')
                .where('userId', '==', user.uid)
                .orderBy('timestamp', 'desc')
                .limit(10)
                .get();
            
            if (snapshot.empty) {
                progressList.innerHTML = '<p class="no-progress">Chưa có dữ liệu tiến trình. Hãy chơi các trò chơi để xem tiến trình tại đây!</p>';
                return;
            }
            
            let totalScore = 0;
            let highScore = 0;
            let totalGames = snapshot.size;
            
            progressList.innerHTML = '';
            
            snapshot.forEach(doc => {
                const data = doc.data();
                const date = data.timestamp ? data.timestamp.toDate() : new Date();
                const formattedDate = date.toLocaleDateString('vi-VN');
                
                const progressItem = document.createElement('div');
                progressItem.className = 'progress-item';
                progressItem.innerHTML = `
                    <div class="progress-game">${this.getGameName(data.gameId)}</div>
                    <div class="progress-score">${data.score}</div>
                    <div class="progress-date">${formattedDate}</div>
                `;
                
                progressList.appendChild(progressItem);
                
                // Update stats
                totalScore += data.score;
                if (data.score > highScore) {
                    highScore = data.score;
                }
            });
            
            // Update stats summary
            const averageScore = totalGames > 0 ? Math.round(totalScore / totalGames) : 0;
            
            const totalGamesEl = document.getElementById('total-games');
            const highScoreEl = document.getElementById('high-score');
            const averageScoreEl = document.getElementById('average-score');
            
            if (totalGamesEl) totalGamesEl.textContent = totalGames;
            if (highScoreEl) highScoreEl.textContent = highScore;
            if (averageScoreEl) averageScoreEl.textContent = averageScore;
            
        } catch (error) {
            console.error('Error loading user scores:', error);
            progressList.innerHTML = '<p class="no-progress">Lỗi khi tải dữ liệu tiến trình.</p>';
        }
    }

    getGameName(gameId) {
        const gameNames = {
            'congtrutrongphamvi10': 'Cộng trừ phạm vi 10',
            'banbongsotoan2': 'Bắn Bóng Số',
            'bangcuuchuong': 'Bảng cửu chương',
            'congtruconhotoan2': 'Cộng trừ có nhớ',
            'congtrusonguyen': 'Cộng trừ số nguyên',
            'nhanchianangcao': 'Nhân chia nâng cao',
            'duongduapheptinh': 'Đường đua phép tính'
        };
        
        return gameNames[gameId] || gameId;
    }

    // Thêm phương thức setupRankingFilters() để sửa lỗi 2
    setupRankingFilters() {
        const rankingFilters = document.querySelectorAll('.ranking-filter');
        rankingFilters.forEach(filter => {
            filter.addEventListener('click', () => {
                const gameType = filter.getAttribute('data-filter');
                
                // Update active filter
                rankingFilters.forEach(f => f.classList.remove('active'));
                filter.classList.add('active');
                
                // Load rankings for selected game
                this.loadRankings(gameType);
            });
        });
    }
}

// Khởi tạo AuthSystem
document.addEventListener('DOMContentLoaded', function() {
    // Chỉ khởi tạo một lần
    if (!window.authSystem) {
        window.authSystem = new AuthSystem();
        
        // Track page view
        if (window.authSystem.analytics) {
            window.authSystem.analytics.logEvent('home_page_view');
        }
        
        // Đóng modal khi click bên ngoài
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });
        
        // Đóng các modal
        const closeButtons = {
            'close-profile-modal': 'profile-modal',
            'close-ranking-modal': 'ranking-modal',
            'close-challenge-modal': 'challenge-modal'
        };
        
        Object.entries(closeButtons).forEach(([buttonId, modalId]) => {
            const button = document.getElementById(buttonId);
            const modal = document.getElementById(modalId);
            if (button && modal) {
                button.addEventListener('click', () => {
                    modal.style.display = 'none';
                });
            }
        });
        
        // Thiết lập bộ lọc lịch sử điểm
        const historyGameFilter = document.getElementById('history-game-filter');
        if (historyGameFilter && window.authSystem) {
            historyGameFilter.addEventListener('change', () => {
                window.authSystem.loadHistoryScores(1);
            });
        }
    }
});